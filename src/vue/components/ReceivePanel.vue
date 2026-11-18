<script setup lang="ts">
import CopyButton from './CopyButton.vue'
import MwkQrCode from './MwkQrCode.vue'

const { address } = defineProps<{ address: string }>()
</script>

<template>
  <div class="mwk-stack mwk-receive">
    <MwkQrCode :value="address" label="受け取り用アドレスのQRコード" />
    <p class="mwk-mono mwk-receive-address">{{ address }}</p>
    <CopyButton :text="address" label="アドレスをコピー" />
    <p class="mwk-muted">モナコイン以外の暗号資産は送らないでください</p>
  </div>
</template>

<style scoped>
.mwk-receive {
  align-items: center;
  text-align: center;
}

.mwk-receive .mwk-muted {
  margin: 0;
}

.mwk-receive-address {
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--mwk-surface);
  font-size: 0.95rem;
  user-select: all;
}
</style>
