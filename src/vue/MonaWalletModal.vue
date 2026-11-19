<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { DEFAULT_EXPLORER_TX_URL } from '../core/constants'
import type { MonaWallet, SendResult } from '../core/wallet'
import AddressColors from './AddressColors.vue'
import { useMonaWallet } from './composables'
import BackupPanel from './components/BackupPanel.vue'
import ConnectPanel from './components/ConnectPanel.vue'
import HomePanel, { type WalletView } from './components/HomePanel.vue'
import MwkIcon from './components/MwkIcon.vue'
import ReceivePanel from './components/ReceivePanel.vue'
import SendPanel from './components/SendPanel.vue'

const {
  wallet,
  title = 'ウォレット',
  explorerTxUrl = DEFAULT_EXPLORER_TX_URL,
} = defineProps<{
  wallet: MonaWallet
  title?: string
  /** 送金後に開くエクスプローラーのURL。{txid} がトランザクションIDに置き換わる。空文字でリンクを出さない */
  explorerTxUrl?: string
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ sent: [result: SendResult] }>()

const snapshot = useMonaWallet(wallet)
const view = shallowRef<'home' | WalletView>('home')
const dialog = useTemplateRef<HTMLDialogElement>('dialog')

const VIEW_TITLES: Record<WalletView, string> = { receive: '受け取る', send: '送る', backup: 'バックアップ' }

const connected = computed(() => snapshot.value.state !== 'disconnected')
const activeView = computed(() => (connected.value ? view.value : 'connect'))
const heading = computed(() => (activeView.value === 'home' || activeView.value === 'connect' ? title : VIEW_TITLES[activeView.value]))
// 送金中・Passkey操作中は閉じない（結果を見落とさないため）
const closable = computed(() => !snapshot.value.sending && !snapshot.value.connecting)

function syncDialog(isOpen: boolean) {
  const el = dialog.value
  if (!el) return
  if (isOpen && !el.open) {
    view.value = 'home'
    el.showModal()
  } else if (!isOpen && el.open) {
    el.close()
  }
}

function requestClose() {
  if (closable.value) open.value = false
}

function onCancel(event: Event) {
  // Escキー。閉じられない間は無視し、閉じる場合もv-model経由で閉じる
  event.preventDefault()
  requestClose()
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) requestClose()
}

watch(open, syncDialog)
onMounted(() => syncDialog(open.value))
onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <dialog ref="dialog" class="mwk-root mwk-modal" aria-labelledby="mwk-modal-title" @cancel="onCancel" @click="onBackdropClick">
    <div class="mwk-modal-panel">
      <header class="mwk-modal-header">
        <button
          v-if="activeView !== 'home' && activeView !== 'connect'"
          type="button"
          class="mwk-icon-btn"
          aria-label="戻る"
          :disabled="snapshot.sending"
          @click="view = 'home'"
        >
          <MwkIcon name="back" />
        </button>
        <h2 id="mwk-modal-title" class="mwk-modal-title">{{ heading }}</h2>
        <button type="button" class="mwk-icon-btn" aria-label="閉じる" :disabled="!closable" @click="requestClose">
          <MwkIcon name="close" />
        </button>
      </header>

      <div v-if="open" class="mwk-modal-body">
        <ConnectPanel v-if="activeView === 'connect'" :wallet="wallet" />
        <HomePanel v-else-if="activeView === 'home'" :wallet="wallet" :snapshot="snapshot" @navigate="view = $event" />
        <ReceivePanel v-else-if="activeView === 'receive' && snapshot.address" :address="snapshot.address" />
        <SendPanel
          v-else-if="activeView === 'send'"
          :wallet="wallet"
          :snapshot="snapshot"
          :explorer-tx-url="explorerTxUrl"
          @sent="emit('sent', $event)"
          @done="view = 'home'"
        />
        <BackupPanel v-else-if="activeView === 'backup'" :wallet="wallet" :snapshot="snapshot" />
        <p v-if="connected && snapshot.address && activeView === 'home'" class="mwk-modal-address mwk-mono">
          {{ snapshot.address }}
        </p>
      </div>
      <!-- アドレスの配色をモーダル下端のフチに表示する -->
      <AddressColors v-if="snapshot.address" :address="snapshot.address" class="mwk-modal-colors" />
    </div>
  </dialog>
</template>

<!-- 共通トークン・部品のスタイル（.mwk-root配下にのみ適用） -->
<style src="./styles.css"></style>

<style scoped>
.mwk-modal {
  width: min(440px, calc(100vw - 32px));
  max-width: none;
  max-height: calc(100dvh - 32px);
  padding: 0;
  border: none;
  border-radius: var(--mwk-modal-radius);
  background: var(--mwk-bg);
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.3);
  overflow: hidden;
}

.mwk-modal::backdrop {
  background: rgb(0 0 0 / 0.45);
}

.mwk-modal-panel {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 32px);
}

.mwk-modal-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 8px 4px 16px;
}

.mwk-modal-header .mwk-icon-btn:first-child {
  margin-left: -8px;
}

.mwk-modal-title {
  flex: 1;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.mwk-modal-colors {
  display: flex;
  flex: none;
  align-self: flex-end;
  width: 40%;
  height: 4px;
  /* 右端がモーダルの角丸で切り取られないよう、角丸の分だけ離す */
  margin-right: var(--mwk-modal-radius);
  border-radius: 4px 4px 0 0;
}

.mwk-modal-body {
  padding: 8px 16px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.mwk-modal-address {
  margin: 18px 0 0;
  color: var(--mwk-muted);
  font-size: 1rem;
  text-align: center;
}

/* スマートフォンでは画面下からのシートにする */
@media (max-width: 520px) {
  .mwk-modal {
    width: 100vw;
    margin: auto 0 0;
    border-radius: var(--mwk-modal-radius) var(--mwk-modal-radius) 0 0;
    max-height: calc(100dvh - 24px);
  }

  .mwk-modal-panel {
    max-height: calc(100dvh - 24px);
  }

  .mwk-modal-body {
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
  }
}
</style>
