<script setup lang="ts">
import { shallowRef } from 'vue'
import { errorMessage, useMonaWallet } from 'monawallet-kit/vue'
import { login, requestChallenge } from '../fakeServer'
import { wallet } from '../wallet'

// ウォレットアドレスをアカウントIDにするログインの流れ（サーバー処理はブラウザ内で模擬）
const snapshot = useMonaWallet(wallet)
const sessionAddress = shallowRef<string | null>(null)
const challengeMessage = shallowRef('')
const error = shallowRef<string | null>(null)
const pending = shallowRef(false)

async function signIn() {
  pending.value = true
  error.value = null
  try {
    const address = await wallet.connect() // ロック中ならPasskeyで解除
    const { message } = requestChallenge(address) // 1. サーバーがチャレンジを発行
    challengeMessage.value = message
    const signature = wallet.signInChallenge(message) // 2. オリジン・アドレス・期限を確認して署名
    sessionAddress.value = (await login(address, message, signature)).sessionAddress // 3. サーバーが検証
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="demo-section">
    <h2>ウォレットでログイン</h2>
    <p v-if="sessionAddress">
      ログイン中：<code>{{ sessionAddress }}</code>
    </p>
    <div class="demo-buttons">
      <button type="button" :disabled="pending || snapshot.state === 'disconnected'" @click="signIn">ログイン</button>
      <button v-if="sessionAddress" type="button" @click="sessionAddress = null">ログアウト</button>
    </div>
    <details v-if="challengeMessage">
      <summary>署名したチャレンジ</summary>
      <pre>{{ challengeMessage }}</pre>
    </details>
    <p v-if="error" class="demo-error" role="alert">{{ error }}</p>
  </section>
</template>
