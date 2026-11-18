# MonaWallet Kit

Passkey（WebAuthn PRF）からモナコイン（MONA）ウォレットを作る、Webアプリ向けのライブラリです。

- ニーモニックを事前に記録しなくても、Passkeyだけで作成・再接続できます。バックアップ（24単語）は必要なときに表示できます。
- 残高・受け取り（QR）・送金・バックアップのモーダル（Vue 3）と、UIなしで使えるAPIを提供します。
- ウォレットアドレスでログインするための、チャレンジ署名と検証のヘルパーを含みます。

> [!WARNING]
> 少額・ホビー用途向けです。Passkeyを失い、24単語のバックアップもない場合、資金は取り出せません。
> PRFに対応していないブラウザ・認証器では利用できません（代替手段はありません）。

## 導入

GitHub Release に添付した tarball を指定します。

```sh
pnpm add https://github.com/anipopina/monawallet-kit/releases/download/v0.1.0/monawallet-kit-0.1.0.tgz
```

Vueのモーダルを使う場合は `vue`（3.5以上）も必要です。

### モーダルを使う

```ts
// wallet.ts（アプリ内で1つだけ作る）
import { MonaWallet } from 'monawallet-kit'

export const wallet = new MonaWallet({
  rpId: 'example.com', // 変更すると別のウォレットになる。本番は固定値にする
  rpName: 'Example',
})
```

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'
import { MonaWalletModal } from 'monawallet-kit/vue'
import 'monawallet-kit/style.css'
import { wallet } from './wallet'

const open = shallowRef(false)
</script>

<template>
  <button @click="open = true">ウォレット</button>
  <MonaWalletModal v-model:open="open" :wallet="wallet" @sent="(r) => console.log(r.txid)" />
</template>
```

### APIを直接使う

```ts
await wallet.checkSupport() // { status: 'supported' | 'unsupported' | 'unknown' }
await wallet.connect() // Passkeyで開く（初回は先に wallet.register()）
await wallet.refreshBalance()
const plan = await wallet.prepareSend({ to, amount: '0.5' }) // 宛先・金額・手数料を利用者に提示
await wallet.send(plan) // 承認後に送信
wallet.signMessage('hello')
```

Vueでは `useMonaWallet(wallet)` で状態（アドレス・残高など）を ref として購読できます。エラーは `MonaWalletError` の `code` で判別し、`errorMessage()`（`monawallet-kit/vue`）で日本語の文言に変換できます。

### ウォレットでログイン（サーバー側）

```ts
import { createSignInChallenge, verifySignIn } from 'monawallet-kit/server'

// 1. チャレンジを発行し、nonce・address・messageをTTL付きで保存する
const { message, nonce } = createSignInChallenge({ appName: 'Example', origin: 'https://example.com', address })
// 2. クライアントは wallet.signInChallenge(message) で署名して送る
// 3. 検証する。consumeNonce で発行済み・未使用かを確認し、原子的に使用済みにする
const { address: verified } = await verifySignIn({
  message, signature, address,
  expected: { appName: 'Example', origin: 'https://example.com' },
  consumeNonce: async (nonce, challenge) => markNonceUsedIfValid(nonce, challenge),
})
```

実際の流れは [デモのログイン例](demo/src/sections/LoginSection.vue) と [模擬サーバー](demo/src/fakeServer.ts) を参照してください。

## 利用しているAPIサーバー

残高・UTXOの取得と送金のブロードキャストには、既定で次の公開サーバーを使っています。いずれも個人の方がボランティアで運用してくださっているものです。モナコインのエコシステムを支えてくださっていることに、この場を借りて感謝します。

- Esplora：`esplora.electrum-mona.org`（通常時）
- Monaparty：`monapa.electrum-mona.org`、`wallet.monaparty.me`（Esploraの障害時）

負荷をかけすぎないよう、不要な連続取得は避けてください。`MonaWallet` の `provider` オプションで、別のサーバーに差し替えることもできます。

## 同じウォレットを開くための条件

同じRP IDで同じPasskeyを使えば、同じアドレス（P2PKH）になります。RP IDを変えると別のウォレットになるため、本番では固定値を指定してください。鍵導出の仕様や、その他の設計判断・制約は [docs/design.md](docs/design.md) にまとめています。

## 開発

```sh
pnpm install
pnpm dev          # デモ（http://localhost:5173）
pnpm check        # 型チェック・Lint・テスト
pnpm build        # dist/ にライブラリをビルド
pnpm format
```

- デモはメインネットで動作します。送金は1回 0.01 MONA までに制限しています。
- スマートフォンで確認するときは、`tailscale serve` などでHTTPS（`*.ts.net`）にして開いてください。Passkeyは HTTPS か localhost でしか動作しません。

## リリース

`package.json` の `version` を更新し、`v<version>` のタグをpushすると、[GitHub Actions](.github/workflows/release.yml) が検証とビルドを行い、tarball を Release に添付します。

## ライセンス

[MIT](LICENSE.txt)
