import { MonaWallet } from 'monawallet-kit'

// デモ用の設定。RP IDは開いているホスト名をそのまま使う（localhost / tailscaleの *.ts.net など）。
// 本番のアプリでは、ウォレットが変わらないよう固定値を指定すること。
export const wallet = new MonaWallet({
  rpId: location.hostname,
  rpName: 'MonaWallet Kit Demo',
  // メインネットでの動作確認用に、1回の送金額を0.01 MONAまでに制限する
  maxSendSat: 1_000_000,
})

// 再訪時に、Passkeyなしで残高だけ表示できるようアドレスを保存する（アドレスは秘密情報ではない）
const STORAGE_KEY = 'monawallet-kit-demo:address'
try {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) wallet.openReadOnly(saved)
} catch {
  // 保存領域が使えない環境では復元しない
}
wallet.subscribe(({ address }) => {
  try {
    if (address) localStorage.setItem(STORAGE_KEY, address)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 保存できなくてもデモの動作には影響しない
  }
})
