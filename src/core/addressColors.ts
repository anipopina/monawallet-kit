// アドレスを8色の並びで表す（デザイン用途。見た目でアドレスの取り違えに気づきやすくする効果もある）。
// 同じアドレスが常に同じ配色になるよう、アルゴリズムは変更しないこと（テストで固定）。
// 暗号学的な識別子ではないため、アドレスの照合には使わないこと。

/** 先頭の1文字（P2PKHでは常に 'M'）を除いた16文字を2文字ずつ区切り、それぞれから1色を作る */
const SKIP_CHARS = 1
const COLOR_COUNT = 8
const CHARS_PER_COLOR = 2

/** アドレスに対応する8色（CSSの `hsl()` 形式）を返す */
export function addressColors(address: string): string[] {
  const body = address.slice(SKIP_CHARS)
  return Array.from({ length: COLOR_COUNT }, (_, i) => colorFrom(body.slice(i * CHARS_PER_COLOR, (i + 1) * CHARS_PER_COLOR)))
}

function colorFrom(seed: string): string {
  const h = hash(seed)
  const hue = mod(h, 360)
  // hから0..1の擬似乱数を2つ作る
  const r1 = mod(h >>> 0, 1000) / 1000
  const r2 = mod((h * 1103515245 + 12345) >>> 0, 1000) / 1000
  const saturation = Math.round(60 + r1 * 30) // 60..90
  const lightness = Math.round(30 + r2 * 30) // 30..60
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = text.charCodeAt(i) + ((h << 5) - h)
  return h
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}
