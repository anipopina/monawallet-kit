<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from 'vue'
import MwkIcon from './MwkIcon.vue'

const FEEDBACK_MS = 2_000

const { text, label = 'コピー' } = defineProps<{ text: string; label?: string }>()
const status = shallowRef<'idle' | 'copied' | 'failed'>('idle')
let timer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  try {
    await navigator.clipboard.writeText(text)
    status.value = 'copied'
  } catch {
    status.value = 'failed'
  }
  clearTimeout(timer)
  timer = setTimeout(() => (status.value = 'idle'), FEEDBACK_MS)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <button type="button" class="mwk-btn" @click="copy">
    <MwkIcon :name="status === 'copied' ? 'check' : 'copy'" />
    <span>{{ status === 'copied' ? 'コピーしました' : status === 'failed' ? 'コピーできませんでした' : label }}</span>
    <span class="mwk-visually-hidden" role="status">{{ status === 'copied' ? 'コピーしました' : '' }}</span>
  </button>
</template>
