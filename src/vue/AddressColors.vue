<script setup lang="ts">
import { computed } from 'vue'
import { addressColors } from '../core/addressColors'

// アドレスの配色を縦縞で描く。大きさは利用側のCSS（width/height）で決める。
// 装飾なので読み上げ対象から外している。アドレスそのものは別途テキストで示すこと。
const { address } = defineProps<{ address: string }>()
const colors = computed(() => addressColors(address))
</script>

<template>
  <span class="mwk-address-colors" aria-hidden="true">
    <span v-for="(color, i) in colors" :key="i" class="mwk-address-color" :style="{ backgroundColor: color }" />
  </span>
</template>

<!-- 利用側のクラスで大きさなどを上書きしやすいよう、:where() で詳細度を0にしている -->
<style>
:where(.mwk-address-colors) {
  display: inline-flex;
  width: 2em;
  height: 2em;
  overflow: hidden;
  vertical-align: middle;
}

:where(.mwk-address-color) {
  flex: 1;
}

/* 明るい背景では暗く沈んで見えるため、コントラストを下げて彩度を上げる。
   アプリ独自のカラーモードに合わせる場合は、利用側のクラスで filter を上書きする */
@media (prefers-color-scheme: light) {
  :where(.mwk-address-colors) {
    filter: contrast(50%) saturate(300%);
  }
}
</style>
