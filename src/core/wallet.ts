import { hex } from '@scure/base'
import type * as btcSigner from '@scure/btc-signer'
import { looksLikeSignInMessage, parseSignInMessage } from '../auth/challenge'
import { isP2pkhAddress, validateAddress } from './address'
import { assertSat, formatMona, parseMona } from './amount'
import { DEFAULT_FEE_RATE_SAT_PER_VBYTE, DUST_THRESHOLD_SAT, PRF_SALT_MESSAGE } from './constants'
import { MonaWalletError } from './errors'
import { deriveKeysFromEntropy, entropyToMnemonic } from './keys'
import { bytesEqual, signMessage } from './message'
import { checkPrfSupport, createPasskey, evaluatePrf, type PrfSupport } from './passkey'
import { defaultProvider, type ChainProvider, type Utxo } from './providers'
import { buildTransaction, selectCoins } from './tx'

export type WalletState = 'disconnected' | 'readonly' | 'unlocked'

export type WalletBalance = {
  confirmedSat: number
  unconfirmedSat: number
  totalSat: number
  /** falseなら未承認の入出金が反映されていない（フォールバックAPI使用時） */
  includesMempool: boolean
  updatedAt: number
}

export type WalletSnapshot = {
  /** disconnected: 未接続 / readonly: アドレスのみ（署名不可） / unlocked: 署名可能 */
  state: WalletState
  address: string | null
  balance: WalletBalance | null
  connecting: boolean
  refreshing: boolean
  sending: boolean
}

export type MonaWalletOptions = {
  /**
   * WebAuthnのRP ID。変更すると別のウォレットになるため、サービスごとに固定値を指定する。
   * 例: 本番 'example.com'、開発時 location.hostname
   */
  rpId: string
  /** Passkey登録時に表示されるサービス名 */
  rpName: string
  /** Passkeyのユーザー名（既定: rpName）。登録日が付加される */
  userName?: string
  /** 既定はEsplora → Monapartyのフォールバック */
  provider?: ChainProvider
  /** sat/vB */
  feeRate?: number
  /** 未承認のUTXOも送金に使う（既定true、既存実装と同じ） */
  spendUnconfirmed?: boolean
  /** 1回の送金額の上限（sat）。検証環境で誤送金の被害を抑えるための任意設定 */
  maxSendSat?: number
}

export type SendRequest = {
  to: string
  /** MONA単位の10進文字列（例 "0.5"）。amountSatと排他 */
  amount?: string
  amountSat?: number
  /** sat/vB。省略時はウォレットの既定値 */
  feeRate?: number
}

/** ユーザー確認に提示する送金内容。send()に渡すと、この内容のトランザクションだけが署名・送信される */
export type SendPlan = Readonly<{
  from: string
  to: string
  amountSat: number
  feeSat: number
  changeSat: number
  /** amountSat + feeSat（アドレスから出ていく総額） */
  totalSat: number
  feeRate: number
  inputCount: number
}>

export type SendResult = { txid: string; plan: SendPlan }

type PlanInternal = { tx: btcSigner.Transaction; inputs: Utxo[] }
type LocalUtxo = Utxo & { txHex: string }

const BALANCE_MAX_AGE_FOR_SEND_MS = 10_000

/**
 * Passkey由来のMONAウォレット。
 * 秘密鍵・エントロピーはprivateフィールドにだけ保持し、getSnapshot()などの公開状態には含めない。
 * Vueなどのリアクティブ状態にこのインスタンスを入れず、getSnapshot()/subscribe()を使うこと。
 */
export class MonaWallet {
  readonly options: Readonly<Required<Omit<MonaWalletOptions, 'maxSendSat' | 'provider'>>> & { maxSendSat?: number }
  readonly provider: ChainProvider
  /**
   * Vueのmarkraw相当。ref()/reactive()に入れられてもProxy化されないようにする
   * （Proxy経由では#privateフィールドにアクセスできず例外になるため）。
   */
  readonly __v_skip = true

  #entropy: Uint8Array | null = null
  #privateKey: Uint8Array | null = null
  #address: string | null = null
  #script: Uint8Array | null = null

  #apiUtxos: Utxo[] = []
  #includesMempool = true
  #changeUtxos: LocalUtxo[] = [] // 自分が送信したトランザクションのお釣り（API未反映でも使えるようtxHexを保持）
  #spentOutpoints = new Set<string>() // 自分が送信済みの入力。APIへの反映前に再利用しない
  #utxos: Utxo[] = []
  #balance: WalletBalance | null = null

  #connecting: Promise<string> | null = null
  #refreshing: Promise<WalletBalance> | null = null
  #sending = false
  #plans = new WeakMap<SendPlan, PlanInternal>()

  #snapshot: WalletSnapshot
  #listeners = new Set<(snapshot: WalletSnapshot) => void>()

  constructor(options: MonaWalletOptions) {
    if (!options.rpId) throw new Error('MonaWallet: rpId is required')
    if (options.maxSendSat !== undefined) assertSat(options.maxSendSat)
    this.options = Object.freeze({
      rpId: options.rpId,
      rpName: options.rpName,
      userName: options.userName ?? options.rpName,
      feeRate: options.feeRate ?? DEFAULT_FEE_RATE_SAT_PER_VBYTE,
      spendUnconfirmed: options.spendUnconfirmed ?? true,
      maxSendSat: options.maxSendSat,
    })
    this.provider = options.provider ?? defaultProvider()
    this.#snapshot = this.#buildSnapshot()
  }

  // MARK: State

  get state(): WalletState {
    if (this.#privateKey) return 'unlocked'
    return this.#address ? 'readonly' : 'disconnected'
  }

  get address(): string | null {
    return this.#address
  }

  get balance(): WalletBalance | null {
    return this.#balance
  }

  getSnapshot(): WalletSnapshot {
    return this.#snapshot
  }

  /** 状態が変わるたびに新しいスナップショットで呼ばれる。戻り値で購読解除 */
  subscribe(listener: (snapshot: WalletSnapshot) => void): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  // MARK: Connection

  checkSupport(): Promise<PrfSupport> {
    return checkPrfSupport()
  }

  /** Passkeyを新規登録する（接続はしない）。登録のたびに別のウォレットになる */
  async register(): Promise<void> {
    await createPasskey({
      rpId: this.options.rpId,
      rpName: this.options.rpName,
      userName: `${this.options.userName} ${dateLabel()}`,
    })
  }

  /**
   * PasskeyのPRFからウォレットを導出し、署名可能な状態にする。
   * readonly状態からの再開（ロック解除）では、同じアドレスにならなければ address_mismatch で失敗する。
   * @param options.expectedAddress アプリのセッションなどで想定しているアドレス
   */
  async connect(options: { expectedAddress?: string } = {}): Promise<string> {
    if (this.#privateKey && this.#address) {
      this.#assertExpected(this.#address, options.expectedAddress)
      return this.#address
    }
    this.#connecting ??= this.#connect(options.expectedAddress).finally(() => {
      this.#connecting = null
      this.#emit()
    })
    this.#emit()
    return await this.#connecting
  }

  async #connect(expectedAddress: string | undefined): Promise<string> {
    const prfOutput = await evaluatePrf({ rpId: this.options.rpId, saltMessage: PRF_SALT_MESSAGE })
    let keys
    try {
      keys = deriveKeysFromEntropy(prfOutput)
    } catch (error) {
      prfOutput.fill(0)
      throw error
    }
    try {
      this.#assertExpected(keys.address, expectedAddress ?? this.#address ?? undefined)
    } catch (error) {
      prfOutput.fill(0)
      keys.privateKey.fill(0)
      throw error
    }
    if (this.#address !== keys.address) this.#resetChainState()
    this.#entropy = prfOutput
    this.#privateKey = keys.privateKey
    this.#address = keys.address
    this.#script = keys.script
    return keys.address
  }

  /**
   * 署名せずに表示だけ行う状態で開く（アプリが保存したアドレスからの復元など）。
   * 送金・署名にはconnect()が必要。
   */
  openReadOnly(address: string): void {
    if (!isP2pkhAddress(address)) throw new MonaWalletError('invalid_address', 'Not a P2PKH Monacoin address')
    if (this.#address === address && !this.#privateKey) return
    this.#wipeSecrets()
    this.#resetChainState()
    this.#address = address
    this.#script = null
    this.#emit()
  }

  /** 秘密情報を破棄してreadonlyに戻す。アドレスと残高は残る */
  lock(): void {
    if (!this.#privateKey) return
    this.#wipeSecrets()
    this.#emit()
  }

  /** 秘密情報・アドレス・残高をすべて破棄する */
  disconnect(): void {
    this.#wipeSecrets()
    this.#resetChainState()
    this.#address = null
    this.#script = null
    this.#emit()
  }

  // MARK: Balance

  /**
   * UTXOを取得して残高を更新する。同時に呼ばれた場合は実行中の取得結果を共有する。
   * @param options.maxAgeMs この期間内に更新済みなら再取得しない
   */
  async refreshBalance(options: { maxAgeMs?: number } = {}): Promise<WalletBalance> {
    const address = this.#requireAddress()
    if (options.maxAgeMs !== undefined && this.#balance && Date.now() - this.#balance.updatedAt <= options.maxAgeMs) return this.#balance
    this.#refreshing ??= this.#refresh(address).finally(() => {
      this.#refreshing = null
      this.#emit()
    })
    this.#emit()
    return await this.#refreshing
  }

  async #refresh(address: string): Promise<WalletBalance> {
    const result = await this.provider.getUtxos(address)
    if (this.#address !== address) throw new MonaWalletError('not_connected', 'Wallet changed during refresh')
    this.#apiUtxos = result.utxos
    this.#includesMempool = result.includesMempool
    this.#recalculate()
    return this.#balance!
  }

  /** API結果に、まだ反映されていない自分の送金（使用済み入力・お釣り）を重ねる（monacube-oldの方式を継承） */
  #recalculate(): void {
    const key = (u: { txid: string; vout: number }) => `${u.txid}:${u.vout}`
    const apiKeys = new Map(this.#apiUtxos.map((u) => [key(u), u]))
    for (const change of this.#changeUtxos) {
      const confirmed = apiKeys.get(key(change))?.confirmed
      if (confirmed) change.confirmed = true
    }
    const changeKeys = new Set(this.#changeUtxos.map(key))
    const merged = [...this.#apiUtxos.filter((u) => !changeKeys.has(key(u))), ...this.#changeUtxos]
    this.#utxos = merged.filter((u) => !this.#spentOutpoints.has(key(u))).sort((a, b) => b.value - a.value)

    const confirmedSat = this.#utxos.filter((u) => u.confirmed).reduce((sum, u) => sum + u.value, 0)
    const unconfirmedSat = this.#utxos.filter((u) => !u.confirmed).reduce((sum, u) => sum + u.value, 0)
    this.#balance = {
      confirmedSat,
      unconfirmedSat,
      totalSat: confirmedSat + unconfirmedSat,
      includesMempool: this.#includesMempool,
      updatedAt: Date.now(),
    }
    this.#emit()
  }

  // MARK: Send

  /**
   * 送金内容を確定する（署名はしない）。返り値をユーザーに提示し、承認後にsend()へ渡す。
   * ロック中（readonly）でも作成できる。
   */
  async prepareSend(request: SendRequest): Promise<SendPlan> {
    const from = this.#requireAddress()
    const to = request.to.trim()
    if (!validateAddress(to)) throw new MonaWalletError('invalid_address', 'Invalid destination address')
    if ((request.amount === undefined) === (request.amountSat === undefined))
      throw new MonaWalletError('invalid_amount', 'Specify either amount or amountSat')
    const amountSat = request.amount !== undefined ? parseMona(request.amount) : request.amountSat!
    assertSat(amountSat)
    if (amountSat <= DUST_THRESHOLD_SAT)
      throw new MonaWalletError('amount_too_small', `Amount must be greater than ${formatMona(DUST_THRESHOLD_SAT)} MONA`)
    const max = this.options.maxSendSat
    if (max !== undefined && amountSat > max)
      throw new MonaWalletError('amount_exceeds_limit', `Amount exceeds the configured limit of ${formatMona(max)} MONA`)
    const feeRate = request.feeRate ?? this.options.feeRate
    if (!(feeRate > 0) || !Number.isFinite(feeRate)) throw new MonaWalletError('invalid_amount', 'Invalid fee rate')

    await this.refreshBalance({ maxAgeMs: BALANCE_MAX_AGE_FOR_SEND_MS })
    const spendable = this.#utxos.filter((u) => this.options.spendUnconfirmed || u.confirmed)
    const selection = selectCoins(spendable, amountSat, feeRate)
    const inputs = await Promise.all(
      selection.inputs.map(async (u) => ({ ...u, prevTxHex: (u as Partial<LocalUtxo>).txHex ?? (await this.provider.getTxHex(u.txid)) })),
    )
    if (this.#address !== from) throw new MonaWalletError('not_connected', 'Wallet changed while preparing')
    const tx = buildTransaction({ inputs, toAddress: to, amountSat, changeAddress: from, changeSat: selection.changeSat })
    const plan: SendPlan = Object.freeze({
      from,
      to,
      amountSat,
      feeSat: selection.feeSat,
      changeSat: selection.changeSat,
      totalSat: amountSat + selection.feeSat,
      feeRate,
      inputCount: inputs.length,
    })
    this.#plans.set(plan, { tx, inputs: selection.inputs })
    return plan
  }

  /** prepareSend()の結果を署名・送信する。同じplanは1回だけ使える */
  async send(plan: SendPlan): Promise<SendResult> {
    const internal = this.#plans.get(plan)
    if (!internal) throw new MonaWalletError('stale_plan', 'Unknown or already used send plan')
    if (!this.#privateKey || !this.#script) throw new MonaWalletError('locked', 'Wallet is locked')
    if (plan.from !== this.#address) throw new MonaWalletError('stale_plan', 'The plan belongs to a different wallet')
    if (this.#sending) throw new MonaWalletError('stale_plan', 'Another transaction is being sent')
    const currentKeys = new Set(this.#utxos.map((u) => `${u.txid}:${u.vout}`))
    if (!internal.inputs.every((u) => currentKeys.has(`${u.txid}:${u.vout}`)))
      throw new MonaWalletError('stale_plan', 'The balance changed since the plan was prepared')

    this.#plans.delete(plan)
    this.#sending = true
    this.#emit()
    try {
      const { tx } = internal
      for (let i = 0; i < tx.inputsLength; i++) tx.signIdx(this.#privateKey, i)
      tx.finalize()
      const txHex = hex.encode(tx.extract())
      await this.provider.broadcast(txHex)
      const txid = tx.id // APIの返り値ではなく、署名したトランザクション自体のIDを正とする
      this.#recordSent(tx, txid, txHex)
      return { txid, plan }
    } finally {
      this.#sending = false
      this.#emit()
    }
  }

  #recordSent(tx: btcSigner.Transaction, txid: string, txHex: string): void {
    for (let i = 0; i < tx.inputsLength; i++) {
      const input = tx.getInput(i)
      if (!input.txid || input.index === undefined) continue
      const key = `${hex.encode(input.txid)}:${input.index}`
      this.#spentOutpoints.add(key)
      this.#changeUtxos = this.#changeUtxos.filter((u) => `${u.txid}:${u.vout}` !== key)
    }
    for (let i = 0; i < tx.outputsLength; i++) {
      const output = tx.getOutput(i)
      if (output.script && output.amount !== undefined && this.#script && bytesEqual(output.script, this.#script))
        this.#changeUtxos.push({ txid, vout: i, value: Number(output.amount), confirmed: false, txHex })
    }
    this.#recalculate()
  }

  // MARK: Signing

  /**
   * 任意のメッセージに署名する（base64、Monacoin Core互換）。
   * サインイン用チャレンジにはsignInChallenge()を使うこと（オリジン等を検査するため、ここでは拒否する）。
   */
  signMessage(message: string): string {
    if (looksLikeSignInMessage(message)) throw new MonaWalletError('invalid_message', 'Use signInChallenge() for sign-in messages')
    return signMessage(message, this.#requirePrivateKey())
  }

  /**
   * サーバーが発行したサインイン用チャレンジに署名する。
   * メッセージのアドレス・オリジン・有効期限がこのウォレットと現在のページに一致しなければ署名しない。
   * @param options.origin 照合するオリジン（既定: location.origin）
   */
  signInChallenge(message: string, options: { origin?: string } = {}): string {
    const privateKey = this.#requirePrivateKey()
    const challenge = parseSignInMessage(message)
    if (!challenge) throw new MonaWalletError('invalid_message', 'Malformed sign-in message')
    const origin = options.origin ?? (typeof location !== 'undefined' ? location.origin : undefined)
    if (!origin || challenge.origin !== origin)
      throw new MonaWalletError('challenge_mismatch', 'The sign-in message is for a different origin')
    if (challenge.address !== this.#address)
      throw new MonaWalletError('challenge_mismatch', 'The sign-in message is for a different address')
    if (challenge.expiresAt.getTime() <= Date.now()) throw new MonaWalletError('challenge_expired', 'The sign-in message has expired')
    return signMessage(message, privateKey)
  }

  // MARK: Backup

  /** 24単語のニーモニックを返す。ユーザーの明示的な操作でのみ呼び、ログや外部送信に含めないこと */
  revealMnemonic(): string {
    if (!this.#entropy) throw new MonaWalletError('locked', 'Wallet is locked')
    return entropyToMnemonic(this.#entropy)
  }

  // MARK: Internals

  #assertExpected(address: string, expected: string | undefined): void {
    if (expected !== undefined && expected !== address)
      throw new MonaWalletError('address_mismatch', 'The passkey opened a different wallet than expected')
  }

  #requireAddress(): string {
    if (!this.#address) throw new MonaWalletError('not_connected', 'Wallet is not connected')
    return this.#address
  }

  #requirePrivateKey(): Uint8Array {
    if (!this.#privateKey) throw new MonaWalletError(this.#address ? 'locked' : 'not_connected', 'Wallet is locked')
    return this.#privateKey
  }

  #wipeSecrets(): void {
    this.#entropy?.fill(0)
    this.#privateKey?.fill(0)
    this.#entropy = null
    this.#privateKey = null
  }

  #resetChainState(): void {
    this.#apiUtxos = []
    this.#changeUtxos = []
    this.#spentOutpoints.clear()
    this.#utxos = []
    this.#balance = null
    this.#includesMempool = true
  }

  #buildSnapshot(): WalletSnapshot {
    return Object.freeze({
      state: this.state,
      address: this.#address,
      balance: this.#balance,
      connecting: this.#connecting !== null,
      refreshing: this.#refreshing !== null,
      sending: this.#sending,
    })
  }

  #emit(): void {
    const next = this.#buildSnapshot()
    const prev = this.#snapshot
    if (
      prev.state === next.state &&
      prev.address === next.address &&
      prev.balance === next.balance &&
      prev.connecting === next.connecting &&
      prev.refreshing === next.refreshing &&
      prev.sending === next.sending
    )
      return
    this.#snapshot = next
    for (const listener of this.#listeners) listener(next)
  }
}

function dateLabel(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
