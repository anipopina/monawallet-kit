import * as btcSigner from '@scure/btc-signer'
import { MONA_NETWORK } from './constants'

/** 送金先として受け付けるMONAアドレスか（M/P/mona1…）。既存実装と同じくbtc-signerのデコード可否で判定する */
export function validateAddress(address: string): boolean {
  try {
    btcSigner.Address(MONA_NETWORK).decode(address)
    return true
  } catch {
    return false
  }
}

/** 本ライブラリのウォレットが使うP2PKH（Mで始まる）アドレスか */
export function isP2pkhAddress(address: string): boolean {
  try {
    return btcSigner.Address(MONA_NETWORK).decode(address).type === 'pkh'
  } catch {
    return false
  }
}

export function addressToScript(address: string): Uint8Array {
  return btcSigner.OutScript.encode(btcSigner.Address(MONA_NETWORK).decode(address))
}

/** P2PKHアドレスから公開鍵ハッシュ（20byte）を取り出す。P2PKHでなければnull */
export function p2pkhAddressToHash(address: string): Uint8Array | null {
  try {
    const decoded = btcSigner.Address(MONA_NETWORK).decode(address)
    return decoded.type === 'pkh' ? decoded.hash : null
  } catch {
    return null
  }
}
