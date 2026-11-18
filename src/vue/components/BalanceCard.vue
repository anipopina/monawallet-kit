<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { formatMona } from '../../core/amount'
import type { MonaWallet, WalletSnapshot } from '../../core/wallet'
import { useAsyncAction } from '../composables'
import MwkIcon from './MwkIcon.vue'

// 表示中に古ければ自動で取り直す間隔
const AUTO_REFRESH_MAX_AGE_MS = 30_000

const { wallet, snapshot } = defineProps<{ wallet: MonaWallet; snapshot: WalletSnapshot }>()
const refresh = useAsyncAction()

const balance = computed(() => snapshot.balance)
const updatedAt = computed(() =>
  balance.value ? new Date(balance.value.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
)

onMounted(() => {
  void refresh.run(() => wallet.refreshBalance({ maxAgeMs: AUTO_REFRESH_MAX_AGE_MS }))
})
</script>

<template>
  <section class="mwk-balance" aria-labelledby="mwk-balance-title">
    <h3 id="mwk-balance-title" class="mwk-balance-title">残高</h3>

    <!-- 取得失敗時も再試行できるよう、更新ボタンは金額の有無にかかわらず表示する -->
    <div class="mwk-balance-row">
      <p v-if="balance" class="mwk-balance-amount">
        <span class="mwk-balance-value">{{ formatMona(balance.totalSat) }}</span>
        <span class="mwk-balance-unit">MONA</span>
      </p>
      <div v-else-if="!refresh.error.value" class="mwk-balance-skeleton" role="status" aria-label="残高を取得しています" />
      <p v-else class="mwk-balance-amount" aria-hidden="true">
        <span class="mwk-balance-value">-</span>
      </p>
      <button
        type="button"
        class="mwk-icon-btn"
        aria-label="残高を更新"
        :disabled="snapshot.refreshing"
        @click="refresh.run(() => wallet.refreshBalance())"
      >
        <MwkIcon name="refresh" :class="{ 'mwk-spin': snapshot.refreshing }" />
      </button>
    </div>

    <template v-if="balance">
      <p v-if="balance.unconfirmedSat !== 0" class="mwk-muted">うち未承認 {{ formatMona(balance.unconfirmedSat) }} MONA</p>
      <p v-if="!balance.includesMempool" class="mwk-muted">現在、未承認の入出金は反映されていない可能性があります。</p>
      <p class="mwk-muted">{{ updatedAt }} 時点</p>
    </template>

    <div v-if="refresh.error.value" class="mwk-error" role="alert">
      <MwkIcon name="alert" />
      <p>残高を取得できませんでした。{{ refresh.error.value }}</p>
    </div>
  </section>
</template>

<style scoped>
.mwk-balance {
  padding: 12px 16px 14px;
  border-radius: var(--mwk-radius);
  background: var(--mwk-surface);
}

.mwk-balance-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: -8px; /* アイコンボタンの余白分、右端を揃える */
}

.mwk-balance-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--mwk-muted);
}

.mwk-balance-amount {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35em;
  margin: 0;
}

.mwk-balance-value {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.mwk-balance-unit {
  font-weight: 600;
}

.mwk-balance p.mwk-muted {
  margin: 2px 0 0;
}

.mwk-balance-skeleton {
  flex: 1;
  height: 3.2rem;
  border-radius: 8px;
  background: var(--mwk-border);
  opacity: 0.5;
  animation: mwk-pulse 1.4s ease-in-out infinite;
}

.mwk-balance .mwk-error {
  margin-top: 8px;
}

.mwk-spin {
  animation: mwk-spin 1s linear infinite;
}

@keyframes mwk-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes mwk-pulse {
  50% {
    opacity: 0.25;
  }
}
</style>
