// ウォレットによるサインインのチャレンジメッセージ（SIWE風、monacube-old の形式を継承）
// サービス名・オリジン・nonce・有効期限をメッセージ自体に含めることで、リプレイや他サービスへの署名流用を防ぐ。
// これはウォレット鍵の署名による認証であり、PasskeyのWebAuthn認証（PRF取得用）とは別物。

export type SignInChallenge = {
  appName: string
  address: string
  origin: string
  nonce: string
  issuedAt: Date
  expiresAt: Date
}

const HEADER_SUFFIX = ' wants you to sign in with your Monacoin address:'

export function formatSignInMessage(challenge: SignInChallenge): string {
  return [
    `${challenge.appName}${HEADER_SUFFIX}`,
    challenge.address,
    '',
    `Origin: ${challenge.origin}`,
    `Nonce: ${challenge.nonce}`,
    `Issued At: ${challenge.issuedAt.toISOString()}`,
    `Expiration Time: ${challenge.expiresAt.toISOString()}`,
  ].join('\n')
}

/** 形式が完全に一致する場合だけ解析結果を返す。余分な行・欠落・不正な日時はnull */
export function parseSignInMessage(message: string): SignInChallenge | null {
  const lines = message.split('\n')
  if (lines.length !== 7) return null
  const [header, address, blank, originLine, nonceLine, issuedLine, expiresLine] = lines as [string, ...string[]]
  if (!header.endsWith(HEADER_SUFFIX) || blank !== '') return null
  const appName = header.slice(0, -HEADER_SUFFIX.length)
  const origin = field(originLine, 'Origin')
  const nonce = field(nonceLine, 'Nonce')
  const issuedAt = date(field(issuedLine, 'Issued At'))
  const expiresAt = date(field(expiresLine, 'Expiration Time'))
  if (!appName || !address || !origin || !nonce || !issuedAt || !expiresAt) return null
  const challenge = { appName, address, origin, nonce, issuedAt, expiresAt }
  // 再整形して一致しない（日時表記の揺れなど）ものは受け付けない
  return formatSignInMessage(challenge) === message ? challenge : null
}

/** サインインメッセージの形をしているか（一般の署名APIで誤ってサインインに使われる署名を作らないための判定） */
export function looksLikeSignInMessage(message: string): boolean {
  return message.split('\n', 1)[0]!.endsWith(HEADER_SUFFIX)
}

function field(line: string | undefined, name: string): string | null {
  const prefix = `${name}: `
  return line?.startsWith(prefix) ? line.slice(prefix.length) : null
}

function date(value: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}
