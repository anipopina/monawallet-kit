<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { checkPrfSupport, type PrfSupport } from 'monawallet-kit'
import { wallet } from '../wallet'

const origin = location.origin
const support = shallowRef<PrfSupport | null>(null)
onMounted(async () => {
  support.value = await checkPrfSupport()
})
</script>

<template>
  <section class="demo-section">
    <h2>利用環境</h2>
    <dl class="demo-dl">
      <dt>PRF対応</dt>
      <dd>
        <template v-if="support"
          >{{ support.status }}<template v-if="support.reason">（{{ support.reason }}）</template></template
        >
        <template v-else>確認中…</template>
      </dd>
      <dt>RP ID</dt>
      <dd>
        <code>{{ wallet.options.rpId }}</code>
      </dd>
      <dt>オリジン</dt>
      <dd>
        <code>{{ origin }}</code>
      </dd>
    </dl>
    <p class="demo-note">unknown は事前判定できない環境です。接続時にPRF非対応が判明した場合はエラーになります。</p>
  </section>
</template>
