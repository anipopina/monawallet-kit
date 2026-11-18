import { SATOSHI_PER_MONA } from './constants'
import { MonaWalletError } from './errors'

// 金額は内部では常にsatの整数で扱う。MONAの小数を浮動小数点で掛け算しない（0.29 * 1e8 は 28999999.999...になる）。
// satは number で扱う。総発行量（約1.05e16 sat）はNumber.MAX_SAFE_INTEGERを超えうるが、
// 少額用途のウォレットで扱う範囲では十分であり、利用側の扱いやすさ（JSON化・表示）を優先する。

const MONA_DECIMAL_RE = /^(\d+)(?:\.(\d{1,8}))?$/

/** "1.5" のようなMONA表記の10進文字列をsatに変換する。9桁以上の小数・指数表記・負数は拒否する */
export function parseMona(input: string): number {
  const text = input.trim()
  const match = MONA_DECIMAL_RE.exec(text)
  if (!match) throw new MonaWalletError('invalid_amount', 'Amount must be a decimal number with up to 8 fractional digits')
  const integerPart = match[1] ?? '0'
  const fractionPart = (match[2] ?? '').padEnd(8, '0')
  const sat = Number(BigInt(integerPart) * BigInt(SATOSHI_PER_MONA) + BigInt(fractionPart))
  assertSat(sat)
  return sat
}

/** satをMONA表記にする。末尾の0は落とす（例: 150000000 → "1.5"） */
export function formatMona(sat: number, options: { minFractionDigits?: number } = {}): string {
  assertSat(sat, true)
  const negative = sat < 0
  const abs = Math.abs(sat)
  const integerPart = Math.floor(abs / SATOSHI_PER_MONA)
  let fraction = String(abs % SATOSHI_PER_MONA)
    .padStart(8, '0')
    .replace(/0+$/, '')
  const minDigits = options.minFractionDigits ?? 0
  if (fraction.length < minDigits) fraction = fraction.padEnd(minDigits, '0')
  return `${negative ? '-' : ''}${integerPart}${fraction ? `.${fraction}` : ''}`
}

export function assertSat(sat: number, allowNegative = false): void {
  if (!Number.isSafeInteger(sat) || (!allowNegative && sat < 0))
    throw new MonaWalletError('invalid_amount', 'Amount in satoshi must be a safe integer')
}
