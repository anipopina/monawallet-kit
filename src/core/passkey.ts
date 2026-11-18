// WebAuthn Passkey と PRF extension
// PRFの出力はPasskey（＝RP ID）ごとに異なる。RP IDを変えると別のウォレットになるため、利用側で固定値を明示する。

import { sha256 } from '@noble/hashes/sha2.js'
import { MonaWalletError } from './errors'

export type PrfSupportStatus = 'supported' | 'unsupported' | 'unknown'
export type PrfSupport = {
  /** unknown: 事前判定の手段がなく、実際にPasskeyを使うまでわからない */
  status: PrfSupportStatus
  reason?: 'webauthn_unavailable' | 'insecure_context' | 'prf_unsupported'
}

/**
 * PRFが使えるかを事前に判定する。
 * 確実に判定できるのは PublicKeyCredential.getClientCapabilities() がある環境のみで、それ以外は unknown を返す。
 * unknown の場合、PRF非対応は接続時の prf_unsupported エラーで判明する。
 */
export async function checkPrfSupport(): Promise<PrfSupport> {
  if (typeof window === 'undefined' || typeof PublicKeyCredential === 'undefined' || !navigator.credentials)
    return { status: 'unsupported', reason: 'webauthn_unavailable' }
  if (!window.isSecureContext) return { status: 'unsupported', reason: 'insecure_context' }
  const getCapabilities = (PublicKeyCredential as { getClientCapabilities?: () => Promise<Record<string, boolean>> }).getClientCapabilities
  if (typeof getCapabilities !== 'function') return { status: 'unknown' }
  try {
    const capabilities = await getCapabilities.call(PublicKeyCredential)
    const prf = capabilities['extension:prf']
    if (prf === true) return { status: 'supported' }
    if (prf === false) return { status: 'unsupported', reason: 'prf_unsupported' }
  } catch {
    // 判定APIの失敗は判定不能として扱う
  }
  return { status: 'unknown' }
}

export type CreatePasskeyParams = {
  rpId: string
  rpName: string
  /** Passkeyマネージャーに表示される名前 */
  userName: string
}

/**
 * Passkeyを新規登録する。登録のたびに別の資格情報（＝別のウォレット）ができる。
 * @returns prfEnabled: 認証器がPRFを有効化したか。undefinedは環境が結果を返さなかった場合
 */
export async function createPasskey(params: CreatePasskeyParams): Promise<{ prfEnabled: boolean | undefined }> {
  const options: PublicKeyCredentialCreationOptions = {
    challenge: randomBytes(32), // 登録の検証はサーバーで行わないため任意の値でよい
    rp: { id: params.rpId, name: params.rpName },
    user: { id: randomBytes(32), name: params.userName, displayName: params.userName },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    // 再接続時はallowCredentialsを指定せずに選択させるため、発見可能な資格情報が必須。
    // （'preferred'ではセキュリティキーなどで発見不能な資格情報が作られ、二度と開けなくなることがある）
    authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'required' },
    attestation: 'none',
    extensions: { prf: {} },
  }
  const credential = await callWebAuthn(() => navigator.credentials.create({ publicKey: options }))
  const prf = (credential.getClientExtensionResults() as { prf?: { enabled?: boolean } }).prf
  if (prf?.enabled === false)
    throw new MonaWalletError(
      'prf_unsupported',
      'The passkey was created, but this authenticator does not support PRF. It cannot be used as a wallet.',
    )
  return { prfEnabled: prf?.enabled }
}

/**
 * 既存のPasskeyでPRFを評価し、256bitの値を返す。saltは saltMessage のSHA-256。
 * 呼び出し側は使用後に返り値を0で埋めること。
 */
export async function evaluatePrf(params: { rpId: string; saltMessage: string }): Promise<Uint8Array> {
  const salt = sha256(new TextEncoder().encode(params.saltMessage))
  const options: PublicKeyCredentialRequestOptions = {
    challenge: randomBytes(32), // 認証はウォレット鍵の署名で行うため任意の値でよい
    rpId: params.rpId,
    userVerification: 'required',
    extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
  }
  const credential = await callWebAuthn(() => navigator.credentials.get({ publicKey: options }))
  const results = (credential.getClientExtensionResults() as { prf?: { results?: { first?: BufferSource } } }).prf?.results
  if (!results?.first)
    throw new MonaWalletError(
      'prf_unsupported',
      'This authenticator or browser does not support WebAuthn PRF, which is required for the wallet.',
    )
  const output = bufferSourceToBytes(results.first)
  if (output.length !== 32) throw new MonaWalletError('passkey_failed', 'Unexpected PRF output length')
  return output
}

async function callWebAuthn(fn: () => Promise<Credential | null>): Promise<PublicKeyCredential> {
  if (typeof navigator === 'undefined' || !navigator.credentials)
    throw new MonaWalletError('webauthn_unavailable', 'WebAuthn is not available in this environment')
  let credential: Credential | null
  try {
    credential = await fn()
  } catch (error) {
    const name = error instanceof Error ? error.name : ''
    // NotAllowedError: ユーザーのキャンセル・タイムアウト・該当Passkeyなし（ブラウザは区別を返さない）
    if (name === 'NotAllowedError' || name === 'AbortError')
      throw new MonaWalletError('passkey_cancelled', 'The passkey operation was cancelled or timed out', { cause: error })
    if (name === 'SecurityError') throw new MonaWalletError('passkey_failed', 'The RP ID is not valid for this origin', { cause: error })
    throw new MonaWalletError('passkey_failed', `Passkey operation failed: ${name || 'unknown error'}`, { cause: error })
  }
  if (!credential || credential.type !== 'public-key') throw new MonaWalletError('passkey_failed', 'No public key credential was returned')
  return credential as PublicKeyCredential
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * BufferSourceを独立したUint8Arrayにコピーする。
 * パスワードマネージャー拡張などは別realmのArrayBufferを返すことがあり、instanceof ArrayBuffer がfalseになるため使わない。
 */
export function bufferSourceToBytes(source: BufferSource): Uint8Array {
  if (ArrayBuffer.isView(source)) return new Uint8Array(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength))
  return new Uint8Array(source).slice()
}
