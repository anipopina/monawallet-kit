<script setup lang="ts">
import { shallowRef } from 'vue'
import { formatMona } from 'monawallet-kit'
import { AddressColors, errorMessage, useMonaWallet } from 'monawallet-kit/vue'
import { wallet } from '../wallet'

// モーダルを使わず、アプリから公開APIを直接呼ぶ例
const snapshot = useMonaWallet(wallet)
const pending = shallowRef(false)
const error = shallowRef<string | null>(null)

async function call(fn: () => unknown) {
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
</script>

<template>
  <section class="demo-section">
    <h2>APIで操作する</h2>
    <dl class="demo-dl">
      <dt>状態</dt>
      <dd>
        <code>{{ snapshot.state }}</code>
        <template v-if="snapshot.connecting">（接続中）</template>
        <template v-if="snapshot.refreshing">（更新中）</template>
        <template v-if="snapshot.sending">（送金中）</template>
      </dd>
      <dt>アドレス</dt>
      <dd class="demo-address">
        <!-- アプリ側でもアドレスの配色を表示できる -->
        <AddressColors v-if="snapshot.address" :address="snapshot.address" class="demo-address-colors" />
        <code>{{ snapshot.address ?? '-' }}</code>
      </dd>
      <dt>残高</dt>
      <dd>
        <template v-if="snapshot.balance">
          承認済み {{ formatMona(snapshot.balance.confirmedSat) }} / 未承認 {{ formatMona(snapshot.balance.unconfirmedSat) }} MONA
          <template v-if="!snapshot.balance.includesMempool">（未承認分は未反映）</template>
        </template>
        <template v-else>-</template>
      </dd>
    </dl>
    <div class="demo-buttons">
      <button type="button" :disabled="pending" @click="call(() => wallet.register())">Passkeyを登録</button>
      <button type="button" :disabled="pending" @click="call(() => wallet.connect())">接続・ロック解除</button>
      <button type="button" :disabled="pending || snapshot.state === 'disconnected'" @click="call(() => wallet.refreshBalance())">
        残高を更新
      </button>
      <button type="button" :disabled="snapshot.state !== 'unlocked'" @click="wallet.lock()">ロック</button>
      <button type="button" :disabled="snapshot.state === 'disconnected'" @click="wallet.disconnect()">切断</button>
    </div>
    <p class="demo-note">「Passkeyを登録」は登録のみ行います。登録のたびに別のウォレットになります。</p>
    <p v-if="error" class="demo-error" role="alert">{{ error }}</p>
  </section>
</template>
