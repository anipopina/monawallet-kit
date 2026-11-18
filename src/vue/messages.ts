import { isMonaWalletError, type MonaWalletErrorCode } from '../core/errors'

// UIの表示文言（日本語）。内部のエラーコードは翻訳せず、表示時にここで変換する。

const ERROR_MESSAGES: Record<MonaWalletErrorCode, string> = {
  webauthn_unavailable: 'このブラウザはPasskeyに対応していません。',
  insecure_context: 'HTTPSで開いたページでのみ利用できます。',
  prf_unsupported:
    'このブラウザまたはPasskeyの保存先はPRF拡張に対応していないため、ウォレットを利用できません。別のブラウザや保存先をお試しください。',
  passkey_cancelled: 'Passkeyの操作がキャンセルされたか、時間切れになりました。',
  passkey_failed: 'Passkeyの操作に失敗しました。',
  not_connected: 'ウォレットが開かれていません。',
  locked: 'ウォレットがロックされています。ロックを解除してください。',
  address_mismatch: '選択したPasskeyは、現在開いているものとは別のウォレットです。正しいPasskeyを選択してください。',
  invalid_address: 'モナコインのアドレスとして正しくありません。',
  invalid_amount: '金額が正しくありません。',
  amount_too_small: '金額が少なすぎます。',
  amount_exceeds_limit: '1回に送金できる上限を超えています。',
  insufficient_funds: '残高が不足しています（手数料を含みます）。',
  stale_plan: '残高が変わったため、送金内容を作り直してください。',
  broadcast_failed: '送金がネットワークに受け付けられませんでした。',
  network_error: '通信に失敗しました。時間をおいて再度お試しください。',
  invalid_message: '署名できない形式のメッセージです。',
  invalid_signature: '署名が正しくありません。',
  challenge_mismatch: 'このサービス向けの署名要求ではありません。',
  challenge_expired: '署名要求の有効期限が切れています。',
  nonce_rejected: '署名要求が無効または使用済みです。',
}

/**
 * 例外を表示用の文言にする。未知の例外の内容（スタックトレースなど）は画面に表示せず、
 * 原因調査のためコンソールにだけ出す（ライブラリの例外には秘密情報を含めない方針）。
 */
export function errorMessage(error: unknown): string {
  if (isMonaWalletError(error)) return ERROR_MESSAGES[error.code]
  console.error('[monawallet-kit] unexpected error:', error)
  return '予期しないエラーが発生しました。詳細はブラウザのコンソールを確認してください。'
}
