<script setup lang="ts">
import { computed } from 'vue'
import { encode } from 'uqr'

// 読み取りの確実さを優先し、ダークモードでも白地に黒で描く
const { value, label } = defineProps<{ value: string; label: string }>()

const qr = computed(() => {
  const { data, size } = encode(value, { ecc: 'M', border: 2 })
  let d = ''
  data.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) d += `M${x} ${y}h1v1h-1z`
    }),
  )
  return { d, size }
})
</script>

<template>
  <svg class="mwk-qr" :viewBox="`0 0 ${qr.size} ${qr.size}`" role="img" :aria-label="label" shape-rendering="crispEdges">
    <rect :width="qr.size" :height="qr.size" fill="#fff" />
    <path :d="qr.d" fill="#000" />
  </svg>
</template>

<style scoped>
.mwk-qr {
  display: block;
  width: 100%;
  max-width: 240px;
  aspect-ratio: 1;
  border-radius: 8px;
}
</style>
