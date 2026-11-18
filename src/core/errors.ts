export type MonaWalletErrorCode =
  // 環境・Passkey
  | 'webauthn_unavailable'
  | 'insecure_context'
  | 'prf_unsupported'
  | 'passkey_cancelled'
  | 'passkey_failed'
  // ウォレット状態
  | 'not_connected'
  | 'locked'
  | 'address_mismatch'
  // 送金
  | 'invalid_address'
  | 'invalid_amount'
  | 'amount_too_small'
  | 'amount_exceeds_limit'
  | 'insufficient_funds'
  | 'stale_plan'
  | 'broadcast_failed'
  // 通信
  | 'network_error'
  // 署名・認証
  | 'invalid_message'
  | 'invalid_signature'
  | 'challenge_mismatch'
  | 'challenge_expired'
  | 'nonce_rejected'

/**
 * ライブラリが投げるエラー。利用側は `code` で分岐し、表示文言はUI側で決める。
 * message・causeに秘密鍵、ニーモニック、PRF出力を含めないこと。
 */
export class MonaWalletError extends Error {
  readonly code: MonaWalletErrorCode

  constructor(code: MonaWalletErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'MonaWalletError'
    this.code = code
  }
}

export function isMonaWalletError(error: unknown, code?: MonaWalletErrorCode): error is MonaWalletError {
  return error instanceof MonaWalletError && (code === undefined || error.code === code)
}
