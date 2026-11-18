<script setup lang="ts">
import type { MonaWallet, WalletSnapshot } from '../../core/wallet'
import { useAsyncAction } from '../composables'
import BalanceCard from './BalanceCard.vue'
import MwkIcon from './MwkIcon.vue'

export type WalletView = 'receive' | 'send' | 'backup'

const { wallet, snapshot } = defineProps<{ wallet: MonaWallet; snapshot: WalletSnapshot }>()
const emit = defineEmits<{ navigate: [view: WalletView] }>()
const unlock = useAsyncAction()
</script>

<template>
  <div class="mwk-stack">
    <BalanceCard :wallet="wallet" :snapshot="snapshot" />

    <div class="mwk-home-actions">
      <button type="button" class="mwk-btn mwk-btn--primary" @click="emit('navigate', 'receive')">受け取る</button>
      <button type="button" class="mwk-btn mwk-btn--primary" @click="emit('navigate', 'send')">送る</button>
    </div>
    <button type="button" class="mwk-btn mwk-btn--block" @click="emit('navigate', 'backup')">バックアップ（24単語）</button>

    <div class="mwk-home-footer">
      <button v-if="snapshot.state === 'unlocked'" type="button" class="mwk-btn" @click="wallet.lock()">
        <MwkIcon name="lock" />
        ロックする
      </button>
      <button v-else type="button" class="mwk-btn" :disabled="unlock.pending.value" @click="unlock.run(() => wallet.connect())">
        <MwkIcon name="unlock" />
        ロックを解除
      </button>
      <button type="button" class="mwk-btn" :disabled="snapshot.sending" @click="wallet.disconnect()">ウォレットを閉じる</button>
    </div>
    <p class="mwk-muted">ロック中は残高の確認だけができます。送金やバックアップの表示にはPasskeyでロックを解除します。</p>
    <div v-if="unlock.error.value" class="mwk-error" role="alert">
      <MwkIcon name="alert" />
      <p>{{ unlock.error.value }}</p>
    </div>
  </div>
</template>

<style scoped>
.mwk-home-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.mwk-home-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--mwk-border);
}

.mwk-home-footer .mwk-btn {
  flex: 1 1 auto;
}

.mwk-stack > p.mwk-muted {
  margin: 0;
}
</style>
