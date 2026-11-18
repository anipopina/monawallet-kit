<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { isMonaWalletError } from '../../core/errors'
import type { PrfSupport } from '../../core/passkey'
import type { MonaWallet } from '../../core/wallet'
import { errorMessage } from '../messages'
import MwkIcon from './MwkIcon.vue'

const { wallet } = defineProps<{ wallet: MonaWallet }>()

const support = shallowRef<PrfSupport | null>(null)
const step = shallowRef<'idle' | 'creating' | 'opening'>('idle')
const error = shallowRef<string | null>(null)

const UNSUPPORTED_TEXT: Record<NonNullable<PrfSupport['reason']>, string> = {
  webauthn_unavailable: 'このブラウザはPasskeyに対応していないため、ウォレットを利用できません。',
  insecure_context: 'HTTPSで開いたページでのみウォレットを利用できます。',
  prf_unsupported: 'このブラウザはPasskeyのPRF拡張に対応していないため、ウォレットを利用できません。別のブラウザをお試しください。',
}

const unsupportedText = computed(() => {
  const s = support.value
  return s?.status === 'unsupported' && s.reason ? UNSUPPORTED_TEXT[s.reason] : null
})
const busy = computed(() => step.value !== 'idle')
const stepText = computed(() =>
  step.value === 'creating' ? 'Passkeyを作成しています…' : step.value === 'opening' ? 'ウォレットを開いています…' : '',
)

onMounted(async () => {
  support.value = await wallet.checkSupport()
})

async function run(action: 'open' | 'create') {
  if (busy.value) return
  error.value = null
  try {
    if (action === 'create') {
      step.value = 'creating'
      await wallet.register()
    }
    step.value = 'opening'
    await wallet.connect()
  } catch (e) {
    let message = errorMessage(e)
    // 既存のPasskeyがない場合もブラウザはキャンセルと区別しない
    if (action === 'open' && isMonaWalletError(e, 'passkey_cancelled'))
      message += 'まだPasskeyを作成していない場合は「新しく作成する」を選んでください。'
    error.value = message
  } finally {
    step.value = 'idle'
  }
}
</script>

<template>
  <div class="mwk-stack">
    <p v-if="support === null" class="mwk-muted" role="status">利用環境を確認しています…</p>

    <div v-else-if="unsupportedText" class="mwk-error" role="alert">
      <MwkIcon name="alert" />
      <p>{{ unsupportedText }}</p>
    </div>

    <template v-else>
      <p class="mwk-intro">Passkeyからウォレットを作成します。事前のメモや登録は不要で、すぐに使い始められます。</p>

      <div class="mwk-notice">
        <MwkIcon name="alert" />
        <p>
          Passkeyを失い、バックアップ（24単語）も記録していない場合、資金を取り出せなくなります。少額での利用を想定しています。バックアップは後からいつでも確認できます。
        </p>
      </div>

      <p v-if="support.status === 'unknown'" class="mwk-muted">
        このブラウザでは対応状況を事前に確認できません。対応していない場合は、Passkeyの操作後にお知らせします。
      </p>

      <button type="button" class="mwk-btn mwk-btn--primary mwk-btn--block" :disabled="busy" @click="run('open')">
        Passkeyでウォレットを開く
      </button>
      <button type="button" class="mwk-btn mwk-btn--block" :disabled="busy" @click="run('create')">新しく作成する</button>
      <p class="mwk-muted">
        すでにこのサービスでPasskeyを作成している場合は「Passkeyでウォレットを開く」を選んでください。新しく作成すると、別のウォレットになります。
      </p>

      <p v-if="busy" class="mwk-muted" role="status">{{ stepText }}</p>
      <div v-if="error" class="mwk-error" role="alert">
        <MwkIcon name="alert" />
        <p>{{ error }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mwk-intro {
  margin: 0;
}
</style>
