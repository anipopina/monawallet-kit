<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import type { MonaWallet, WalletSnapshot } from '../../core/wallet'
import { useAsyncAction } from '../composables'
import CopyButton from './CopyButton.vue'
import MwkIcon from './MwkIcon.vue'

const { wallet, snapshot } = defineProps<{ wallet: MonaWallet; snapshot: WalletSnapshot }>()

// 表示中だけ保持し、隠す・ロック・画面を離れるときに破棄する
const mnemonic = shallowRef<string | null>(null)
const unlock = useAsyncAction()
const words = computed(() => mnemonic.value?.split(' ') ?? [])

async function reveal() {
  await unlock.run(async () => {
    if (wallet.state !== 'unlocked') await wallet.connect()
    mnemonic.value = wallet.revealMnemonic()
  })
}

function hide() {
  mnemonic.value = null
}

watch(
  () => snapshot.state,
  (state) => {
    if (state !== 'unlocked') hide()
  },
)
onBeforeUnmount(hide)
</script>

<template>
  <div class="mwk-stack">
    <p class="mwk-backup-lead">
      24個の英単語（ニーモニック）は、このウォレットのバックアップです。Passkeyを失っても、これがあれば他のウォレットアプリで資金を取り出せます。
    </p>
    <div class="mwk-notice">
      <MwkIcon name="alert" />
      <ul class="mwk-backup-rules">
        <li>知った人は誰でも資金を移動できます。誰にも教えないでください。</li>
        <li>周囲や画面共有・録画に映らないことを確認してから表示してください。</li>
        <li>紙に書くなど、オンラインでない場所に保管するのがおすすめです。</li>
      </ul>
    </div>

    <template v-if="mnemonic">
      <ol class="mwk-words" aria-label="ニーモニック（24単語）">
        <li v-for="(word, i) in words" :key="i" class="mwk-word">
          <span class="mwk-word-index">{{ i + 1 }}</span>
          <span class="mwk-mono">{{ word }}</span>
        </li>
      </ol>
      <button type="button" class="mwk-btn mwk-btn--primary mwk-btn--block" @click="hide">隠す</button>
      <CopyButton :text="mnemonic" label="コピー（非推奨）" />
      <p class="mwk-muted">コピーした内容は、他のアプリから読み取られる可能性があります。</p>
    </template>
    <template v-else>
      <button type="button" class="mwk-btn mwk-btn--primary mwk-btn--block" :disabled="unlock.pending.value" @click="reveal">
        {{ snapshot.state === 'unlocked' ? '24単語を表示する' : 'ロックを解除して表示する' }}
      </button>
      <div v-if="unlock.error.value" class="mwk-error" role="alert">
        <MwkIcon name="alert" />
        <p>{{ unlock.error.value }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mwk-backup-lead,
.mwk-stack > p.mwk-muted {
  margin: 0;
}

.mwk-backup-rules {
  margin: 0;
  padding-left: 1.1em;
}

.mwk-words {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5em, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mwk-word {
  display: flex;
  align-items: baseline;
  gap: 0.5em;
  padding: 6px 10px;
  border: 1px solid var(--mwk-border);
  border-radius: 8px;
}

.mwk-word-index {
  min-width: 1.6em;
  color: var(--mwk-muted);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
