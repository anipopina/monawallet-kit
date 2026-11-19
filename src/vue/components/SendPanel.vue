<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { formatMona } from '../../core/amount'
import type { MonaWallet, SendPlan, SendResult, WalletSnapshot } from '../../core/wallet'
import { useAsyncAction } from '../composables'
import MwkIcon from './MwkIcon.vue'

const { wallet, snapshot, explorerTxUrl } = defineProps<{
  wallet: MonaWallet
  snapshot: WalletSnapshot
  /** {txid} を含むURL。空文字ならエクスプローラーへのリンクを出さない */
  explorerTxUrl: string
}>()
const emit = defineEmits<{ sent: [result: SendResult]; done: [] }>()

const to = shallowRef('')
const amount = shallowRef('')
const plan = shallowRef<SendPlan | null>(null)
const result = shallowRef<SendResult | null>(null)
const prepare = useAsyncAction()
const submit = useAsyncAction()

const maxSendSat = wallet.options.maxSendSat
const locked = computed(() => snapshot.state !== 'unlocked')
const explorerHref = computed(() =>
  result.value && explorerTxUrl ? explorerTxUrl.replaceAll('{txid}', encodeURIComponent(result.value.txid)) : null,
)
const balanceAfterSat = computed(() => (plan.value && snapshot.balance ? snapshot.balance.totalSat - plan.value.totalSat : null))

async function onPrepare() {
  plan.value = (await prepare.run(() => wallet.prepareSend({ to: to.value, amount: amount.value }))) ?? null
}

async function onSend() {
  const current = plan.value
  if (!current) return
  const sent = await submit.run(async () => {
    if (wallet.state !== 'unlocked') await wallet.connect()
    return await wallet.send(current)
  })
  if (sent) {
    result.value = sent
    plan.value = null
    emit('sent', sent)
  }
}

function backToForm() {
  plan.value = null
  submit.clearError()
}

function reset() {
  result.value = null
  to.value = ''
  amount.value = ''
}
</script>

<template>
  <!-- 完了 -->
  <div v-if="result" class="mwk-stack">
    <p class="mwk-send-done" role="status">
      <MwkIcon name="check" />
      {{ formatMona(result.plan.amountSat) }} MONA を送金しました
    </p>
    <p class="mwk-muted">ネットワークで承認されるまで数分かかります</p>
    <div class="mwk-field">
      <span class="mwk-label">トランザクションID</span>
      <span class="mwk-mono mwk-small">{{ result.txid }}</span>
    </div>
    <a v-if="explorerHref" class="mwk-btn mwk-btn--block" :href="explorerHref" target="_blank" rel="noopener noreferrer">
      エクスプローラーで開く
      <MwkIcon name="external" />
      <span class="mwk-visually-hidden">（新しいタブで開きます）</span>
    </a>
    <button type="button" class="mwk-btn mwk-btn--block" @click="reset">続けて送る</button>
    <button type="button" class="mwk-btn mwk-btn--primary mwk-btn--block" @click="emit('done')">完了</button>
  </div>

  <!-- 確認 -->
  <div v-else-if="plan" class="mwk-stack">
    <p class="mwk-send-confirm-lead">次の内容で送金します。送金後は取り消せません。</p>
    <dl class="mwk-summary">
      <div class="mwk-summary-row mwk-summary-row--block">
        <dt>送金先</dt>
        <dd class="mwk-mono">{{ plan.to }}</dd>
      </div>
      <div class="mwk-summary-row">
        <dt>送金額</dt>
        <dd class="mwk-summary-amount">{{ formatMona(plan.amountSat) }} MONA</dd>
      </div>
      <div class="mwk-summary-row">
        <dt>手数料</dt>
        <dd>{{ formatMona(plan.feeSat) }} MONA</dd>
      </div>
      <div class="mwk-summary-row mwk-summary-row--total">
        <dt>合計</dt>
        <dd>{{ formatMona(plan.totalSat) }} MONA</dd>
      </div>
      <div v-if="balanceAfterSat !== null" class="mwk-summary-row">
        <dt>送金後の残高</dt>
        <dd>{{ formatMona(balanceAfterSat) }} MONA</dd>
      </div>
    </dl>
    <p v-if="locked" class="mwk-muted">送金の前にPasskeyでロックを解除します</p>
    <div v-if="submit.error.value" class="mwk-error" role="alert">
      <MwkIcon name="alert" />
      <p>{{ submit.error.value }}</p>
    </div>
    <p v-if="submit.pending.value" class="mwk-muted" role="status">送金しています…</p>
    <button type="button" class="mwk-btn mwk-btn--primary mwk-btn--block" :disabled="submit.pending.value" @click="onSend">
      {{ locked ? 'ロックを解除して送金する' : '送金する' }}
    </button>
    <button type="button" class="mwk-btn mwk-btn--block" :disabled="submit.pending.value" @click="backToForm">内容を修正する</button>
  </div>

  <!-- 入力 -->
  <form v-else class="mwk-stack" novalidate @submit.prevent="onPrepare">
    <div class="mwk-field">
      <label class="mwk-label" for="mwk-send-to">送金先アドレス</label>
      <input
        id="mwk-send-to"
        v-model="to"
        class="mwk-input mwk-mono"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        required
      />
    </div>
    <div class="mwk-field">
      <label class="mwk-label" for="mwk-send-amount">送金額</label>
      <div class="mwk-input-group">
        <input
          id="mwk-send-amount"
          v-model="amount"
          class="mwk-input"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          placeholder="0.1"
          required
        />
        <span class="mwk-unit">MONA</span>
      </div>
      <span v-if="snapshot.balance" class="mwk-muted">残高 {{ formatMona(snapshot.balance.totalSat) }} MONA</span>
      <span v-if="maxSendSat !== undefined" class="mwk-muted">1回の上限 {{ formatMona(maxSendSat) }} MONA</span>
    </div>
    <div v-if="prepare.error.value" class="mwk-error" role="alert">
      <MwkIcon name="alert" />
      <p>{{ prepare.error.value }}</p>
    </div>
    <button type="submit" class="mwk-btn mwk-btn--primary mwk-btn--block" :disabled="prepare.pending.value || !to || !amount">
      {{ prepare.pending.value ? '確認しています…' : '確認画面へ' }}
    </button>
  </form>
</template>

<style scoped>
.mwk-unit {
  font-weight: 600;
}

.mwk-small {
  font-size: 0.85rem;
}

.mwk-send-done {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin: 0;
  color: var(--mwk-success);
  font-size: 1.1rem;
  font-weight: 700;
}

.mwk-send-confirm-lead,
.mwk-stack > p.mwk-muted {
  margin: 0;
}

.mwk-summary {
  margin: 0;
  border: var(--mwk-border-width) solid var(--mwk-border);
  border-radius: var(--mwk-radius);
}

.mwk-summary-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
}

.mwk-summary-row + .mwk-summary-row {
  border-top: var(--mwk-border-width) solid var(--mwk-border);
}

.mwk-summary-row--block {
  flex-direction: column;
  gap: 2px;
}

.mwk-summary-row dt {
  color: var(--mwk-muted);
  font-size: 0.875rem;
}

.mwk-summary-row dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.mwk-summary-row--block dd {
  text-align: left;
}

.mwk-summary-amount {
  font-size: 1.25rem;
  font-weight: 700;
}

.mwk-summary-row--total dd {
  font-weight: 700;
}
</style>
