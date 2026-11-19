// 1つの案・1つの画面を、本物のモーダルで表示する（Passkeyとチェーンは偽物）
import { sha256 } from '@noble/hashes/sha2.js'
import { hex } from '@scure/base'
import * as btc from '@scure/btc-signer'
import { createApp, h, shallowRef } from 'vue'
import { MonaWallet, type ChainProvider, type Utxo } from 'monawallet-kit'
import { MonaWalletModal } from 'monawallet-kit/vue'
import { PRESETS, presetCss } from './presets'

const params = new URLSearchParams(location.search)
const preset = PRESETS.find((p) => p.id === params.get('preset')) ?? PRESETS[0]!
const scheme = params.get('scheme') === 'dark' ? 'dark' : 'light'
const screen = params.get('screen') ?? 'home'

// 案のトークンと、背後の「アプリ画面」の見た目
const bg = params.get('bg') ?? 'gallery'
const style = document.createElement('style')
const app =
  scheme === 'dark'
    ? { page: '#15171c', bar: '#1c1f25', card: '#22252c', fg: '#e8e9ec', muted: '#9aa0aa', line: '#2e323a', btn: '#3b82f6' }
    : { page: '#f4f5f7', bar: '#ffffff', card: '#ffffff', fg: '#1d1f23', muted: '#636975', line: '#e2e5ea', btn: '#2563eb' }
style.textContent = `${presetCss(preset, scheme)}
  html { color-scheme: ${scheme}; } body { margin: 0; background: ${app.page}; color: ${app.fg}; overflow: hidden; font-family: system-ui, sans-serif; }
  .app-bar { display: flex; align-items: center; gap: 16px; padding: 10px 16px; background: ${app.bar}; border-bottom: 1px solid ${app.line}; }
  .app-logo { font-weight: 800; font-size: 18px; }
  .app-nav { display: flex; gap: 12px; color: ${app.muted}; font-size: 14px; flex: 1; }
  .app-wallet { padding: 6px 12px; border-radius: 999px; border: 1px solid ${app.line}; font-size: 14px; font-weight: 600; }
  .app-main { padding: 16px; }
  .app-title { margin: 4px 0 12px; font-size: 20px; }
  .app-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .app-card { background: ${app.card}; border-radius: 12px; overflow: hidden; border: 1px solid ${app.line}; }
  .app-thumb { aspect-ratio: 4 / 3; }
  .app-card-body { padding: 8px 10px 10px; font-size: 13px; }
  .app-card-title { font-weight: 700; }
  .app-card-meta { display: flex; justify-content: space-between; align-items: center; color: ${app.muted}; margin-top: 4px; }
  .app-tip { padding: 2px 10px; border-radius: 999px; background: ${app.btn}; color: #fff; font-weight: 600; }
  .app-article { max-width: 640px; }
  .app-article p { line-height: 1.8; margin: 0 0 12px; }
  .app-article .app-meta { color: ${app.muted}; font-size: 13px; }
  .sk { display: grid; gap: 12px; padding: 16px; }
  .sk div { border-radius: 8px; background: ${app.line}; }`
document.head.append(style)

const ARTWORKS = [
  ['夕焼けの屋上', 'mona_art', 18],
  ['青い金魚', 'kingyo', 200],
  ['駅前の猫', 'nekoze', 32],
  ['雨の商店街', 'ameya', 280],
  ['夏の自販機', 'jihanki', 140],
  ['夜の観覧車', 'kanransha', 320],
  ['苔むした石段', 'kokemusu', 100],
  ['ネオンの路地', 'neon_alley', 300],
] as const
const pageEl = document.querySelector('#app-page')!
const bar = `<header class="app-bar"><span class="app-logo">Sample Gallery</span><nav class="app-nav"><span>新着</span><span>人気</span><span>タグ</span></nav><span class="app-wallet">1.23 MONA</span></header>`
if (bg === 'gallery') {
  pageEl.innerHTML = `${bar}<main class="app-main"><h1 class="app-title">新着の作品</h1><div class="app-grid">${ARTWORKS.map(
    (
      [title, author, hue],
      i,
    ) => `<article class="app-card"><div class="app-thumb" style="background: linear-gradient(${120 + i * 25}deg, hsl(${hue} 75% 62%), hsl(${(hue + 50) % 360} 70% 38%))"></div>
      <div class="app-card-body"><div class="app-card-title">${title}</div><div class="app-card-meta"><span>@${author}</span><span class="app-tip">投げ銭</span></div></div></article>`,
  ).join('')}</div></main>`
} else if (bg === 'article') {
  const para =
    'モナコインで作品に投げ銭できるようになりました。気に入った作品の「投げ銭」ボタンを押すと、ウォレットが開き、少額のモナコインを作者に直接送れます。手数料はとても安く、数分で相手に届きます。'
  pageEl.innerHTML = `${bar}<main class="app-main"><article class="app-article"><h1 class="app-title">投げ銭機能をはじめました</h1><p class="app-meta">2026年11月19日・お知らせ</p>${[para, para, para, para].map((t) => `<p>${t}</p>`).join('')}</article></main>`
} else {
  pageEl.innerHTML = `<div class="sk"><div style="height:40px"></div><div style="height:14px;width:70%"></div><div style="height:14px;width:40%"></div><div style="height:120px"></div><div style="height:120px"></div></div>`
}

// MARK: 偽のPasskey（固定のPRF出力を返す）
const entropy = sha256(new TextEncoder().encode('monawallet-kit design lab'))
// HTTP（非セキュアコンテキスト）で開いた場合は navigator.credentials 自体がないため、丸ごと差し替える
const fakeCredentials = {
  get: async () => ({ type: 'public-key', getClientExtensionResults: () => ({ prf: { results: { first: entropy.slice().buffer } } }) }),
  create: async () => ({ type: 'public-key', getClientExtensionResults: () => ({ prf: { enabled: true } }) }),
}
Object.defineProperty(navigator, 'credentials', { value: fakeCredentials, configurable: true })
Object.defineProperty(window, 'PublicKeyCredential', {
  value: { getClientCapabilities: async () => ({ 'extension:prf': true }) },
  configurable: true,
})
Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })

// MARK: 偽のチェーン（残高 1.23456789 MONA、うち未承認 0.05）
const NET = { bech32: 'mona', pubKeyHash: 0x32, scriptHash: 0x37, wif: 0xb0 }
const txs = new Map<string, string>()
const utxos: Utxo[] = []
function fund(address: string, value: number, confirmed: boolean, seed: number) {
  const raw = btc.RawTx.encode({
    version: 2,
    segwitFlag: false,
    inputs: [{ txid: new Uint8Array(32).fill(seed), index: 0, finalScriptSig: new Uint8Array(0), sequence: 0xffffffff }],
    outputs: [{ amount: BigInt(value), script: btc.OutScript.encode(btc.Address(NET).decode(address)) }],
    witnesses: [],
    lockTime: 0,
  })
  const txid = hex.encode(sha256(sha256(raw)).reverse())
  txs.set(txid, hex.encode(raw))
  utxos.push({ txid, vout: 0, value, confirmed })
}
const provider: ChainProvider = {
  name: 'lab',
  getUtxos: async () => ({ utxos: utxos.map((u) => ({ ...u })), includesMempool: true }),
  getTxHex: async (txid) => txs.get(txid)!,
  broadcast: async (txHex) => btc.Transaction.fromRaw(hex.decode(txHex)).id,
}

const wallet = new MonaWallet({ rpId: location.hostname, rpName: 'Design Lab', provider })
const open = shallowRef(true)
createApp({ render: () => h(MonaWalletModal, { wallet, open: open.value, 'onUpdate:open': () => {} }) }).mount('#app')

// MARK: 画面の状態まで自動で進める
const dialog = () => document.querySelector('dialog')!
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
async function until<T>(fn: () => T | null | undefined): Promise<T> {
  for (let i = 0; i < 100; i++) {
    const v = fn()
    if (v) return v
    await wait(50)
  }
  throw new Error('timeout')
}
const button = (text: string) => until(() => [...dialog().querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(text)))
const click = async (text: string) => (await button(text)).click()
function fill(selector: string, value: string) {
  const el = dialog().querySelector<HTMLInputElement>(selector)!
  el.value = value
  el.dispatchEvent(new Event('input'))
}

async function run() {
  if (screen === 'connect') return
  const address = await wallet.connect()
  fund(address, 118_456_789, true, 1)
  fund(address, 5_000_000, false, 2)
  await wallet.refreshBalance()
  if (screen === 'receive') await click('受け取る')
  if (['send', 'done', 'error'].includes(screen)) {
    await click('送る')
    await until(() => dialog().querySelector('#mwk-send-to'))
    fill('#mwk-send-to', 'MBNQ6HS13uuQkX9m2RVB88vWeHd379PMJ2')
    fill('#mwk-send-amount', screen === 'error' ? '5' : '0.042')
    await wait(50)
    await click('確認画面へ')
    if (screen === 'done') await click('送金する')
  }
  if (screen === 'backup') {
    await click('バックアップ')
    await click('24単語を表示する')
  }
}
run()
  .catch((e) => console.error(e))
  .finally(() => (document.activeElement as HTMLElement | null)?.blur())
