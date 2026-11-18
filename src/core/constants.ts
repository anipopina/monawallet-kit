// 鍵導出・ネットワークの定数
// PRF入力・導出パス・ネットワーク値は変更しないこと。
// 変更すると作成済みのウォレットのアドレスが変わり、資金にアクセスできなくなる。

export const SATOSHI_PER_MONA = 100_000_000

/** PRFのsaltは、このメッセージのSHA-256ダイジェスト */
export const PRF_SALT_MESSAGE = 'wallet-seed:v1'

/** BIP44 Monacoin（coin type 22）、P2PKH。BIP39パスフレーズは使わない */
export const DERIVATION_PATH = "m/44'/22'/0'/0/0"

export const MONA_NETWORK = {
  bech32: 'mona',
  pubKeyHash: 0x32, // 50, 'M'
  scriptHash: 0x37, // 55, 'P'
  wif: 0xb0, // 176
} as const

/** Bitcoin互換のメッセージ署名プレフィックス（先頭の\x19は続く文字列の長さ25） */
export const MESSAGE_PREFIX = '\x19Monacoin Signed Message:\n'

// 送金関連の既定値
export const DEFAULT_FEE_RATE_SAT_PER_VBYTE = 200
/** これ以下の出力はダストとして作らない（お釣りは手数料に回す） */
export const DUST_THRESHOLD_SAT = 546
/** P2PKH入力・出力・固定部分の概算vsize */
export const TX_VSIZE = { input: 148, output: 34, overhead: 10 } as const

/** Esploraが失敗したら、この期間はフォールバック先を優先する */
export const PROVIDER_FAILOVER_MS = 60_000
