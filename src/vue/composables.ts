import { onScopeDispose, readonly, shallowRef, type Ref, type ShallowRef } from 'vue'
import type { MonaWallet, WalletSnapshot } from '../core/wallet'
import { errorMessage } from './messages'

/**
 * ウォレットの状態をVueのrefとして購読する。呼び出したスコープの破棄時に購読を解除する。
 * 秘密情報はスナップショットに含まれない。
 */
export function useMonaWallet(wallet: MonaWallet): Readonly<ShallowRef<WalletSnapshot>> {
  const snapshot = shallowRef(wallet.getSnapshot())
  const unsubscribe = wallet.subscribe((next) => {
    snapshot.value = next
  })
  onScopeDispose(unsubscribe)
  return readonly(snapshot) as Readonly<ShallowRef<WalletSnapshot>>
}

/** UI操作1つ分の実行中・エラー状態。エラーは表示用文言に変換して保持する */
export function useAsyncAction() {
  const pending = shallowRef(false)
  const error = shallowRef<string | null>(null)

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (pending.value) return undefined
    pending.value = true
    error.value = null
    try {
      return await fn()
    } catch (e) {
      error.value = errorMessage(e)
      return undefined
    } finally {
      pending.value = false
    }
  }

  return {
    pending: readonly(pending) as Readonly<Ref<boolean>>,
    error: readonly(error) as Readonly<Ref<string | null>>,
    run,
    clearError: () => {
      error.value = null
    },
  }
}
