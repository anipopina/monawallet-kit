# MonaWallet Kit 設計メモ

実装上の判断、既存実装（`passkey-monawallet` / `monacube-old`）との互換・相違点、運用上の制約をまとめる。数値や既定値はコードの定義（主に [`src/core/constants.ts`](../src/core/constants.ts)）を正とする。

## 移植元

- 両リポジトリの共通ファイルを比較し、ほぼ上位互換だった `monacube-old` のコードを正として移植した（`esplora.ts`、`monaparty.ts` は両者で同一）。
- Monapartyのアセット操作はスコープ外。Esplora障害時のフォールバックに使う3つのAPI（UTXO取得、生トランザクション取得、ブロードキャスト）だけを持ち込んだ。

## 鍵導出（変更禁止）

- PRFのsalt：`SHA-256("wallet-seed:v1")`
- PRF出力（256bit）→ BIP39英語24単語（パスフレーズなし）→ `m/44'/22'/0'/0/0` → P2PKH（`M`で始まるアドレス）
- P2WPKHはサポートしない。Monacoinでは取引所の対応状況が悪く、トラブルの原因になりうるため。
- 互換性は、`monacube-old` の `MonaWallet` で生成したテストベクトル（[`src/core/__tests__/vectors.ts`](../src/core/__tests__/vectors.ts)）で固定している。
- 実機でも確認済み：既存アプリの開発時に `localhost` で登録したPasskeyから、同じアドレス・残高にアクセスできた（2026-11-18）。

## RP ID

- PRFの出力はPasskeyに、PasskeyはRP IDに紐づくため、RP IDが変わると別のウォレットになる。このため `rpId` は利用側の必須設定にした。
- 既存の値：`monacube-old` はホスト名の末尾2ラベル（例 `example.com`）、`passkey-monawallet` は `location.hostname`。既存アプリを移行するときは同じ値を渡す。
- 「末尾2ラベル」の算出は `co.jp` や `github.io` などで誤るため、ライブラリには組み込まない。
- 開発時は `localhost` か、`tailscale serve` によるHTTPS（`*.ts.net`）で開く。WebAuthnは安全なコンテキスト（HTTPS または localhost）を必要とし、IPアドレスはRP IDにできない。開発用の値で作ったウォレットは本番とは別物になる。

## Passkey

- 登録時に `residentKey: 'required'` を指定する（既存実装は `'preferred'`）。再接続は `allowCredentials` なしで資格情報を選ばせるため、発見不能な資格情報が作られると二度と開けなくなる。既存の資格情報やアドレスには影響しない。
- PRFの対応判定は `PublicKeyCredential.getClientCapabilities()` がある環境でのみ確定できる。それ以外は `unknown` を返し、非対応は接続時に `prf_unsupported` として判明する。
- 登録のたびに別の資格情報、つまり別のウォレットができる。UIでは既存のPasskeyで開く操作を主にし、新規作成すると別のウォレットになることを明示している。
- パスワードマネージャー拡張（1Passwordで確認）は `navigator.credentials` を置き換え、拡張側の実行環境（realm）で作った ArrayBuffer をPRF出力として返す。この値は `instanceof ArrayBuffer` が false になるため、WebAuthn の戻り値を `instanceof` で判定しないこと（`ArrayBuffer.isView()` などを使う）。旧実装にも同じ問題があった。
- 登録と接続はそれぞれPasskeyの操作が必要で、新規作成時は2回になる。登録時にPRFを評価して1回にまとめる方法は、認証器によって対応状況に差があるため見送った。

## 状態と秘密情報

- 状態は `disconnected` / `readonly` / `unlocked` の3つ。`monacube-old` の `MonaWalletRo` / `MonaWallet` とロック処理を、1つのクラスの状態として整理した。
- PRF出力、秘密鍵、エントロピーは `#private` フィールドにだけ保持し、ロック・切断時に0で埋めて破棄する。ニーモニックは保持せず、`revealMnemonic()` のたびにエントロピーから生成する。
- Vueの `ref()` などに入れても Proxy 化されないよう、`MonaWallet` に `__v_skip` を付けている（Proxy経由では `#private` フィールドにアクセスできないため）。UIには秘密情報を含まないスナップショット（`getSnapshot()` / `subscribe()`）だけを渡す。
- ライブラリは何も永続化しない。readonly 状態での再表示用にアドレスを保存するかどうかはアプリが決める（デモでは localStorage に保存している）。

## 残高・UTXO

- 送金直後は、API結果に自分の送金をローカルで重ね合わせる（使用済みの入力を除外し、お釣りを未承認として追加する）。この方式は `monacube-old` から継承した。お釣りは署名済みトランザクション全体を保持しているため、APIに反映される前でも次の送金の入力に使える。
- この情報はメモリ上にしかなく、再読み込みすると失われる。直後にAPIがまだ使用済みのUTXOを返すと、それを使った送金はノードに二重支払いとして拒否される（`broadcast_failed`）。
- 未承認のUTXOも送金に使う（既存と同じ、`spendUnconfirmed` で変更可）。ただしコイン選択では承認済みのものを優先する。
- 旧実装にあった「10秒以内の残高更新を黙って無視する」制限は廃止した。同時に呼ばれた場合は実行中の取得結果を共有し、`maxAgeMs` を指定したときだけキャッシュを返す。

## チェーンAPI

- 既定：Esplora（electrum-mona）を使い、通信障害時は Monaparty（counterblock、2エンドポイント）にフォールバックする。障害が起きたプロバイダーは60秒間後回しにする。旧実装は一度失敗するとセッション中ずっと切り替わったままだった。
- Monapartyの `get_chain_address_info` はmempoolを反映しない。フォールバック中は `balance.includesMempool = false` になり、UIは未承認の入出金が反映されていない可能性を表示する。
- ブロードキャストへの4xxはノードによる拒否とみなし、別経路で再送しない。
- `ChainProvider` を実装すれば、別のAPIに差し替えられる。

## 送金

- 金額は sat の整数で扱う。入力は10進文字列として厳密に解析する（旧実装の `Math.floor(amount * 1e8)` は、例えば 0.29 MONA を 1 sat 少なく送っていた）。
- コイン選択：旧実装は「金額 + 0.001 MONA」に達した時点で選択を打ち切ってから手数料を計算していたため、入力が多いと残高があっても失敗した。現在は入力を追加するたびに手数料込みで判定する。手数料の概算（P2PKH 148/34/10 vB、200 sat/vB）は既存の値を継承した。
- 546 sat 以下のお釣りは出力にせず、手数料に含める。確認画面に出す `feeSat` はこれを含んだ実額。
- `prepareSend()` で送金内容（宛先・金額・手数料・お釣り）を確定し、利用者が承認したら `send(plan)` で署名・送信する。plan は1回しか使えず、内部のトランザクションはアプリから改変できない。入力が使用済みなら `stale_plan` になる。
- `maxSendSat` で1回の送金額に上限を設定できる。デモでは 0.01 MONA に設定している。

## メッセージ署名・認証

- 署名形式はBitcoin互換（プレフィックスは `\x19Monacoin Signed Message:\n`、署名は base64 の65バイト）。`bitcoinjs-message` を `@noble/curves` に置き換えた。互換性は次の3点で確認し、そのうえで `bitcoinjs-message` を依存から削除した。
  - 決定的な署名がバイト単位で一致する
  - 旧実装の署名を新実装で検証できる
  - 新実装の署名を `bitcoinjs-message` で検証できる（320件）
- サインイン用のメッセージ形式は `monacube-old` と同じSIWE風。サービス名、オリジン、nonce、発行日時、有効期限を含む。
- クライアントの `signInChallenge()` は、オリジン・アドレス・有効期限が一致しなければ署名しない。一般用の `signMessage()` はサインイン形式のメッセージを拒否し、取り違えを防ぐ。
- サーバー（`monawallet-kit/server`）は形式、サービス名、オリジン（開発用に複数可）、有効期限、署名を検証する。最後にアプリの `consumeNonce` を呼ぶ。nonceの保存・原子的な使用済み化、セッション発行、ユーザー情報はアプリの責務。

## UI

- Vue 3専用。`<dialog>` を使ったモーダルで、狭い画面では下からのシートとして表示する。通知ライブラリには依存せず、結果やエラーはモーダル内に表示する。アプリは `sent` イベントで自前の通知を出せる。
- 色などは `.mwk-root` 上の `--mwk-*` トークンで定義しており、アプリから上書きできる。QRコードは読み取りやすさを優先し、常に白地に黒で描く。アイコンは本ライブラリ用に描いた簡易なSVG。
- 文言は日本語のみ。エラーはコードから文言に変換して表示し、例外の内容は表示しない。

## 未対応・今後の候補

- QRコードの読み取り：iOS Safariが `BarcodeDetector` に対応していないため、外部ライブラリが必要。v0.1では見送った。
- Monapartyアセットの表示・送付
- 送金額の「全額」指定、手数料率の選択UI
- ブロックエクスプローラーへのリンク（安定して使えるエクスプローラーを確認してから追加する）
