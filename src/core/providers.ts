// チェーン情報の取得・ブロードキャスト
// 既定はEsplora（electrum-mona）を使い、障害時にMonaparty（counterblock）へフォールバックする。
// Monapartyの get_chain_address_info はmempoolを反映しないため、未承認UTXOが返らない（includesMempool=false）。

import { PROVIDER_FAILOVER_MS } from './constants'
import { MonaWalletError } from './errors'

export type Utxo = {
  txid: string
  vout: number
  /** sat */
  value: number
  confirmed: boolean
}

export type UtxoResult = {
  utxos: Utxo[]
  /** 未承認（mempool上）のUTXOを含む結果か */
  includesMempool: boolean
}

export interface ChainProvider {
  readonly name: string
  getUtxos(address: string): Promise<UtxoResult>
  getTxHex(txid: string): Promise<string>
  /** 署名済みトランザクションを送信し、txidを返す */
  broadcast(txHex: string): Promise<string>
}

const REQUEST_TIMEOUT_MS = 15_000
const TXID_RE = /^[0-9a-f]{64}$/

export const DEFAULT_ESPLORA_ENDPOINT = 'https://esplora.electrum-mona.org/api/'
export const DEFAULT_MONAPARTY_ENDPOINTS = ['https://monapa.electrum-mona.org/_api', 'https://wallet.monaparty.me/_api']

// MARK: Esplora

export function esploraProvider(options: { endpoint?: string } = {}): ChainProvider {
  const base = options.endpoint ?? DEFAULT_ESPLORA_ENDPOINT
  return {
    name: 'esplora',
    async getUtxos(address) {
      const res = await request(`${base}address/${encodeURIComponent(address)}/utxo`)
      const list = (await res.json()) as EsploraUtxo[]
      const utxos = list.map((u) => ({ txid: u.txid, vout: u.vout, value: u.value, confirmed: u.status.confirmed }))
      return { utxos, includesMempool: true }
    },
    async getTxHex(txid) {
      const res = await request(`${base}tx/${encodeURIComponent(txid)}/hex`)
      return (await res.text()).trim()
    },
    async broadcast(txHex) {
      const res = await request(`${base}tx`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: txHex }, true)
      return parseTxid(await res.text())
    },
  }
}

type EsploraUtxo = {
  txid: string
  vout: number
  value: number
  status: { confirmed: boolean }
}

// MARK: Monaparty (counterblock)

export function monapartyProvider(options: { endpoints?: string[] } = {}): ChainProvider {
  const endpoints = options.endpoints ?? DEFAULT_MONAPARTY_ENDPOINTS
  let preferred = 0 // 直近で成功したエンドポイント

  async function rpc<T>(method: string, params: unknown, isBroadcast = false): Promise<T> {
    let firstError: unknown
    for (let i = 0; i < endpoints.length; i++) {
      const index = (preferred + i) % endpoints.length
      try {
        const res = await request(
          endpoints[index]!,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 0, method, params }),
          },
          isBroadcast,
        )
        const json = (await res.json()) as { result?: T; error?: unknown }
        if (json.error) {
          const detail = JSON.stringify(json.error)
          if (isBroadcast) throw new MonaWalletError('broadcast_failed', `Broadcast rejected: ${detail}`)
          throw new MonaWalletError('network_error', `Monaparty RPC error: ${detail}`)
        }
        preferred = index
        return json.result as T
      } catch (error) {
        if (isMonaWalletBroadcastRejection(error)) throw error
        firstError ??= error
      }
    }
    throw firstError
  }

  return {
    name: 'monaparty',
    async getUtxos(address) {
      const result = await rpc<CbChainAddressInfo[]>('get_chain_address_info', {
        addresses: [address],
        with_uxtos: true, // API側の綴り
        with_last_txn_hashes: false,
      })
      const info = result[0]
      if (!info) throw new MonaWalletError('network_error', 'Monaparty returned no address info')
      const utxos = (info.uxtos ?? []).map((u) => ({
        txid: u.txid,
        vout: u.vout,
        value: Math.round(Number(u.amount) * 100_000_000), // amountはMONA単位の文字列
        confirmed: u.confirmations > 0,
      }))
      return { utxos, includesMempool: false }
    },
    async getTxHex(txid) {
      return await rpc<string>('proxy_to_counterpartyd', { method: 'getrawtransaction', params: { tx_hash: txid } })
    },
    async broadcast(txHex) {
      return parseTxid(await rpc<string>('broadcast_tx', { signed_tx_hex: txHex }, true))
    },
  }
}

type CbChainAddressInfo = {
  uxtos?: { txid: string; vout: number; amount: string; confirmations: number }[]
}

// MARK: Fallback

/**
 * 先頭から順に試し、通信障害（network_error）のときだけ次のプロバイダーに切り替える。
 * 障害が起きたプロバイダーは一定時間後回しにする（毎回タイムアウトを待たないため）。
 * ブロードキャストの明示的な拒否（broadcast_failed）は別経路でも結果が変わらないため、そのまま返す。
 */
export function fallbackProvider(providers: ChainProvider[], options: { failoverMs?: number } = {}): ChainProvider {
  if (providers.length === 0) throw new Error('fallbackProvider requires at least one provider')
  const failoverMs = options.failoverMs ?? PROVIDER_FAILOVER_MS
  const downUntil = new Map<ChainProvider, number>()

  async function run<T>(fn: (p: ChainProvider) => Promise<T>): Promise<T> {
    const now = Date.now()
    const healthy = providers.filter((p) => (downUntil.get(p) ?? 0) <= now)
    const ordered = [...healthy, ...providers.filter((p) => !healthy.includes(p))]
    let firstError: unknown
    for (const provider of ordered) {
      try {
        const result = await fn(provider)
        downUntil.delete(provider)
        return result
      } catch (error) {
        if (!(error instanceof MonaWalletError) || error.code !== 'network_error') throw error
        downUntil.set(provider, Date.now() + failoverMs)
        firstError ??= error
      }
    }
    throw firstError
  }

  return {
    name: providers.map((p) => p.name).join('+'),
    getUtxos: (address) => run((p) => p.getUtxos(address)),
    getTxHex: (txid) => run((p) => p.getTxHex(txid)),
    broadcast: (txHex) => run((p) => p.broadcast(txHex)),
  }
}

export function defaultProvider(): ChainProvider {
  return fallbackProvider([esploraProvider(), monapartyProvider()])
}

// MARK: Helpers

/**
 * fetchの失敗・タイムアウト・5xxはnetwork_error。
 * ブロードキャストへの4xxはノードによる拒否とみなしbroadcast_failed（レスポンス本文を含める）。
 */
async function request(url: string, init: RequestInit = {}, isBroadcast = false): Promise<Response> {
  let res: Response
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch (error) {
    throw new MonaWalletError('network_error', `Request failed: ${new URL(url).host}`, { cause: error })
  }
  if (res.ok) return res
  if (isBroadcast && res.status >= 400 && res.status < 500) {
    const detail = (await res.text().catch(() => '')).slice(0, 500)
    throw new MonaWalletError('broadcast_failed', `Broadcast rejected (HTTP ${res.status}): ${detail}`)
  }
  throw new MonaWalletError('network_error', `HTTP ${res.status} from ${new URL(url).host}`)
}

function parseTxid(text: string): string {
  const txid = text.trim()
  if (!TXID_RE.test(txid)) throw new MonaWalletError('broadcast_failed', 'Unexpected broadcast response')
  return txid
}

function isMonaWalletBroadcastRejection(error: unknown): boolean {
  return error instanceof MonaWalletError && error.code === 'broadcast_failed'
}
