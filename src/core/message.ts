// Bitcoin互換のメッセージ署名（Monacoin Coreの signmessage / verifymessage と同じ形式）
// 署名: base64( header(1) || r(32) || s(32) )、header = 27 + recoveryId (+4 圧縮公開鍵)
// 形式はテストベクトル（__tests__/vectors.ts）で固定している。

import { secp256k1 } from '@noble/curves/secp256k1.js'
import { ripemd160 } from '@noble/hashes/legacy.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { base64 } from '@scure/base'
import { p2pkhAddressToHash } from './address'
import { MESSAGE_PREFIX } from './constants'

export function messageHash(message: string): Uint8Array {
  const prefix = new TextEncoder().encode(MESSAGE_PREFIX)
  const body = new TextEncoder().encode(message)
  const payload = concatBytes(prefix, encodeVarInt(body.length), body)
  return sha256(sha256(payload))
}

export type SignMessageOptions = {
  /**
   * 署名のnonce生成に乱数を混ぜる（RFC6979 + 追加エントロピー）。既定true。
   * falseにすると決定的な署名になり、テストベクトルの照合に使える。
   */
  extraEntropy?: boolean
}

/** 圧縮公開鍵（P2PKH）として署名する */
export function signMessage(message: string, privateKey: Uint8Array, options: SignMessageOptions = {}): string {
  const sig = secp256k1.sign(messageHash(message), privateKey, {
    prehash: false,
    format: 'recovered',
    extraEntropy: options.extraEntropy ?? true,
  })
  const recoveryId = sig[0]!
  const out = new Uint8Array(65)
  out[0] = 27 + recoveryId + 4
  out.set(sig.subarray(1), 1)
  return base64.encode(out)
}

/** P2PKHアドレスに対する署名を検証する。形式不正は例外にせずfalseを返す */
export function verifyMessage(message: string, address: string, signature: string): boolean {
  try {
    const expectedHash = p2pkhAddressToHash(address)
    if (!expectedHash) return false
    const bytes = base64.decode(signature)
    if (bytes.length !== 65) return false
    const header = bytes[0]!
    if (header < 27 || header > 34) return false // 31-34: 圧縮, 27-30: 非圧縮。セグウィット用ヘッダーは扱わない
    const compressed = header >= 31
    const recoveryId = (header - 27) & 3
    const recoverable = new Uint8Array(65)
    recoverable[0] = recoveryId
    recoverable.set(bytes.subarray(1), 1)
    const recovered = secp256k1.recoverPublicKey(recoverable, messageHash(message), { prehash: false })
    const publicKey = secp256k1.Point.fromBytes(recovered).toBytes(compressed)
    return bytesEqual(ripemd160(sha256(publicKey)), expectedHash)
  } catch {
    return false
  }
}

function encodeVarInt(n: number): Uint8Array {
  if (n < 0xfd) return Uint8Array.of(n)
  if (n <= 0xffff) return Uint8Array.of(0xfd, n & 0xff, n >>> 8)
  const out = new Uint8Array(5)
  out[0] = 0xfe
  new DataView(out.buffer).setUint32(1, n, true)
  return out
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0))
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
