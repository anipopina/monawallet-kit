<script setup lang="ts">
// 本ライブラリ用に描いた簡易な線画アイコン（外部アイコンセット・CDNに依存しない）。
// 装飾扱い（aria-hidden）。意味はボタンのラベルやaria-labelで伝える。
export type IconName = 'close' | 'back' | 'copy' | 'refresh' | 'check' | 'lock' | 'unlock' | 'alert' | 'external'

const { name } = defineProps<{ name: IconName }>()

const PATHS: Record<IconName, string[]> = {
  close: ['M6 6l12 12', 'M18 6L6 18'],
  back: ['M15 5l-7 7 7 7'],
  copy: ['M9 9h10v11H9z', 'M5 15V4h10'],
  refresh: ['M20 12a8 8 0 1 1-2.34-5.66', 'M20 4v5h-5'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  lock: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
  unlock: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 6.8-1.2'],
  alert: ['M12 4l9 16H3z', 'M12 10v4.5', 'M12 17.2v.3'],
  external: ['M14 5h5v5', 'M19 5l-8 8', 'M17 14v5H5V7h5'],
}
</script>

<template>
  <svg
    class="mwk-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="d in PATHS[name]" :key="d" :d="d" />
  </svg>
</template>

<style scoped>
.mwk-icon {
  width: 1.25em;
  height: 1.25em;
  flex: none;
}
</style>
