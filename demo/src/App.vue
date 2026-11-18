<script setup lang="ts">
import { shallowRef } from 'vue'
import { formatMona, type SendResult } from 'monawallet-kit'
import { MonaWalletModal, useMonaWallet } from 'monawallet-kit/vue'
import { wallet } from './wallet'
import ApiSection from './sections/ApiSection.vue'
import EnvironmentSection from './sections/EnvironmentSection.vue'
import LoginSection from './sections/LoginSection.vue'
import SendSection from './sections/SendSection.vue'
import SignSection from './sections/SignSection.vue'

const snapshot = useMonaWallet(wallet)
const modalOpen = shallowRef(false)
const lastSent = shallowRef<SendResult | null>(null)
</script>

<template>
  <header class="demo-header">
    <h1>MonaWallet Kit デモ</h1>
    <button type="button" class="demo-wallet-button" @click="modalOpen = true">
      <template v-if="snapshot.balance">{{ formatMona(snapshot.balance.totalSat) }} MONA</template>
      <template v-else>ウォレット</template>
    </button>
  </header>

  <main class="demo-main">
    <p class="demo-warning">メインネットで動作します。このデモでは1回の送金を0.01 MONAまでに制限しています。少額で試してください。</p>

    <EnvironmentSection />
    <section class="demo-section">
      <h2>ウォレットモーダル</h2>
      <p>右上のボタン、または下のボタンでライブラリのモーダルを開きます。</p>
      <button type="button" @click="modalOpen = true">モーダルを開く</button>
      <p v-if="lastSent">
        モーダルから送金しました（sentイベント）：{{ formatMona(lastSent.plan.amountSat) }} MONA / <code>{{ lastSent.txid }}</code>
      </p>
    </section>
    <ApiSection />
    <SendSection />
    <SignSection />
    <LoginSection />
  </main>

  <MonaWalletModal v-model:open="modalOpen" :wallet="wallet" title="デモのウォレット" @sent="lastSent = $event" />
</template>
