import { HDKey } from '@scure/bip32'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import * as btcSigner from '@scure/btc-signer'
import { DERIVATION_PATH, MONA_NETWORK } from './constants'

export type DerivedKeys = {
  address: string
  publicKey: Uint8Array
  privateKey: Uint8Array
  /** P2PKHのscriptPubKey */
  script: Uint8Array
}

/**
 * PRF出力（256bit）をBIP39エントロピーとして扱い、24単語ニーモニック → シード → P2PKH鍵を導出する。
 * monacube-old の MonaWallet(entropy, 'P2PKH') と同じ結果になる（テストベクトルで固定）。
 */
export function deriveKeysFromEntropy(entropy: Uint8Array): DerivedKeys {
  if (entropy.length !== 32) throw new Error('Entropy must be 32 bytes')
  return deriveKeysFromMnemonic(entropyToMnemonic(entropy))
}

export function deriveKeysFromMnemonic(mnemonic: string): DerivedKeys {
  const seed = bip39.mnemonicToSeedSync(mnemonic) // パスフレーズなし（既存実装と同じ）
  const root = HDKey.fromMasterSeed(seed)
  const child = root.derive(DERIVATION_PATH)
  if (!child.publicKey || !child.privateKey) throw new Error('Failed to derive key')
  const privateKey = new Uint8Array(child.privateKey)
  const publicKey = new Uint8Array(child.publicKey)
  child.wipePrivateData()
  root.wipePrivateData()
  seed.fill(0)

  const p2pkh = btcSigner.p2pkh(publicKey, MONA_NETWORK)
  if (!p2pkh.address) throw new Error('Failed to generate address')
  return { address: p2pkh.address, publicKey, privateKey, script: p2pkh.script }
}

export function entropyToMnemonic(entropy: Uint8Array): string {
  return bip39.entropyToMnemonic(entropy, wordlist)
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic, wordlist)
}
