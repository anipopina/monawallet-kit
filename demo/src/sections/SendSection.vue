<script setup lang="ts">
import { shallowRef } from 'vue'
import { formatMona, type SendPlan } from 'monawallet-kit'
import { errorMessage } from 'monawallet-kit/vue'
import { wallet } from '../wallet'

// モーダルを使わずに送金する例。prepareSend()の内容をユーザーに見せ、承認後にsend()を呼ぶ
const to = shallowRef('')
const amount = shallowRef('')
const plan = shallowRef<SendPlan | null>(null)
const txid = shallowRef<string | null>(null)
const error = shallowRef<string | null>(null)
const pending = shallowRef(false)

async function step(fn: () => Promise<void>) {
  pending.value = true
  error.value = null
  try {
    await fn()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    pending.value = false
  }
}

const prepare = () =>
  step(async () => {
    txid.value = null
    plan.value = await wallet.prepareSend({ to: to.value, amount: amount.value })
  })

const send = () =>
  step(async () => {
    if (!plan.value) return
    txid.value = (await wallet.send(plan.value)).txid
    plan.value = null
  })
</script>

<template>
  <section class="demo-section">
    <h2>APIで送金する</h2>
    <form class="demo-form" @submit.prevent="prepare">
      <label>送金先 <input v-model="to" autocomplete="off" spellcheck="false" /></label>
      <label>金額（MONA） <input v-model="amount" inputmode="decimal" autocomplete="off" /></label>
      <button type="submit" :disabled="pending || !to || !amount">送金内容を作成</button>
    </form>
    <div v-if="plan" class="demo-plan">
      <p>
        <code>{{ plan.to }}</code> へ <strong>{{ formatMona(plan.amountSat) }} MONA</strong>（手数料
        {{ formatMona(plan.feeSat) }} MONA、合計 {{ formatMona(plan.totalSat) }} MONA）
      </p>
      <div class="demo-buttons">
        <button type="button" :disabled="pending" @click="send">承認して送金</button>
        <button type="button" :disabled="pending" @click="plan = null">やめる</button>
      </div>
      <p class="demo-note">ロック中は送金できません（locked エラー）。先に「接続・ロック解除」を行ってください。</p>
    </div>
    <p v-if="txid">
      送金しました：<code>{{ txid }}</code>
    </p>
    <p v-if="error" class="demo-error" role="alert">{{ error }}</p>
  </section>
</template>
