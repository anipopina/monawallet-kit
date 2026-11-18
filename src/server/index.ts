// サーバー側のウォレットサインイン補助（Node.js 20+ / Lambda / ブラウザで動作。DOM・Vueに依存しない）
// nonceの保存・使い捨て処理、セッション発行、ユーザー情報はアプリの責務。

import { formatSignInMessage, parseSignInMessage, type SignInChallenge } from '../auth/challenge'
import { isP2pkhAddress } from '../core/address'
import { MonaWalletError } from '../core/errors'
import { verifyMessage } from '../core/message'

export { formatSignInMessage, parseSignInMessage, type SignInChallenge } from '../auth/challenge'
export { isP2pkhAddress, validateAddress } from '../core/address'
export { MonaWalletError, isMonaWalletError, type MonaWalletErrorCode } from '../core/errors'
export { verifyMessage } from '../core/message'

const DEFAULT_TTL_SEC = 5 * 60
/** クライアントとサーバーの時計のずれの許容幅 */
const CLOCK_SKEW_MS = 60_000

export type CreateChallengeParams = {
  /** メッセージ先頭に表示するサービス名 */
  appName: string
  /** サインインを受け付けるWebアプリのオリジン（例 https://example.com） */
  origin: string
  address: string
  ttlSec?: number
  now?: Date
}

/**
 * サインイン用チャレンジを作る。アプリは返り値のnonce・address・messageを有効期限付きで保存し、
 * verifySignIn() の consumeNonce で照合・使い捨てにする。
 */
export function createSignInChallenge(params: CreateChallengeParams): SignInChallenge & { message: string } {
  if (!isP2pkhAddress(params.address)) throw new MonaWalletError('invalid_address', 'Not a P2PKH Monacoin address')
  const issuedAt = new Date(Math.floor((params.now ?? new Date()).getTime() / 1000) * 1000)
  const expiresAt = new Date(issuedAt.getTime() + (params.ttlSec ?? DEFAULT_TTL_SEC) * 1000)
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
  const challenge: SignInChallenge = { appName: params.appName, address: params.address, origin: params.origin, nonce, issuedAt, expiresAt }
  return { ...challenge, message: formatSignInMessage(challenge) }
}

export type VerifySignInParams = {
  message: string
  signature: string
  /** クライアントが主張するアドレス。省略時はメッセージ中のアドレスを使う */
  address?: string
  expected: {
    appName: string
    /** 開発環境（localhost・tailscale等）も受け付ける場合は配列で列挙する */
    origin: string | string[]
  }
  /**
   * 署名が正しい場合に最後に呼ばれる。nonceが発行済み・未使用・同じaddress/messageに対して発行されたものかを確認し、
   * 原子的に使用済みにしてtrueを返す。falseならnonce_rejected。
   */
  consumeNonce: (nonce: string, challenge: SignInChallenge & { message: string }) => boolean | Promise<boolean>
  now?: Date
}

/** サインインを検証し、成功したらアドレスを返す。失敗時はMonaWalletError（code）を投げる */
export async function verifySignIn(params: VerifySignInParams): Promise<{ address: string; challenge: SignInChallenge }> {
  const challenge = parseSignInMessage(params.message)
  if (!challenge) throw new MonaWalletError('invalid_message', 'Malformed sign-in message')
  const origins = Array.isArray(params.expected.origin) ? params.expected.origin : [params.expected.origin]
  if (challenge.appName !== params.expected.appName || !origins.includes(challenge.origin))
    throw new MonaWalletError('challenge_mismatch', 'The sign-in message is for a different service')
  if (params.address !== undefined && params.address !== challenge.address)
    throw new MonaWalletError('challenge_mismatch', 'Address does not match the sign-in message')
  if (!isP2pkhAddress(challenge.address)) throw new MonaWalletError('invalid_address', 'Not a P2PKH Monacoin address')

  const now = (params.now ?? new Date()).getTime()
  if (challenge.expiresAt.getTime() <= now) throw new MonaWalletError('challenge_expired', 'The sign-in message has expired')
  if (challenge.issuedAt.getTime() > now + CLOCK_SKEW_MS)
    throw new MonaWalletError('invalid_message', 'The sign-in message is issued in the future')

  if (!verifyMessage(params.message, challenge.address, params.signature))
    throw new MonaWalletError('invalid_signature', 'Invalid signature')
  if (!(await params.consumeNonce(challenge.nonce, { ...challenge, message: params.message })))
    throw new MonaWalletError('nonce_rejected', 'Unknown, expired or already used nonce')
  return { address: challenge.address, challenge }
}
