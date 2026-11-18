<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { verifyMessage } from 'monawallet-kit'
import { errorMessage, useMonaWallet } from 'monawallet-kit/vue'
import { wallet } from '../wallet'

const snapshot = useMonaWallet(wallet)
const message = shallowRef('こんにちは、モナコイン')
const signature = shallowRef('')
const verifyAddress = shallowRef('')
const error = shallowRef<string | null>(null)

const verified = computed(() =>
  signature.value && verifyAddress.value ? verifyMessage(message.value, verifyAddress.value.trim(), signature.value.trim()) : null,
)

function sign() {
  error.value = null
  try {
    signature.value = wallet.signMessage(message.value)
    verifyAddress.value = snapshot.value.address ?? ''
  } catch (e) {
    error.value = errorMessage(e)
  }
}
</script>

<template>
  <section class="demo-section">
    <h2>メッセージ署名・検証</h2>
    <div class="demo-form">
      <label>メッセージ <textarea v-model="message" rows="2" /></label>
      <button type="button" :disabled="snapshot.state !== 'unlocked'" @click="sign">このウォレットで署名</button>
      <label>署名（base64） <textarea v-model="signature" rows="2" spellcheck="false" /></label>
      <label>アドレス <input v-model="verifyAddress" spellcheck="false" /></label>
    </div>
    <p v-if="verified !== null" :class="verified ? 'demo-ok' : 'demo-error'">
      {{ verified ? '検証OK：このアドレスによる署名です' : '検証NG：署名・メッセージ・アドレスが一致しません' }}
    </p>
    <p class="demo-note">Monacoin Core の signmessage / verifymessage と同じ形式です。</p>
    <p v-if="error" class="demo-error" role="alert">{{ error }}</p>
  </section>
</template>
