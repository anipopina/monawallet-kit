import { afterEach, describe, expect, it, vi } from 'vitest'
import { MonaWalletError } from './errors'
import { esploraProvider, fallbackProvider, monapartyProvider, type ChainProvider } from './providers'

const TXID = 'a'.repeat(64)

function fakeProvider(name: string, impl: Partial<ChainProvider>): ChainProvider {
  const fail = async () => {
    throw new Error('not implemented')
  }
  return { name, getUtxos: fail, getTxHex: fail, broadcast: fail, ...impl }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fallbackProvider', () => {
  it('falls back on network errors and deprioritizes the failed provider', async () => {
    const primary = vi.fn(async () => {
      throw new MonaWalletError('network_error', 'down')
    })
    const secondary = vi.fn(async () => 'hex')
    const provider = fallbackProvider([fakeProvider('a', { getTxHex: primary }), fakeProvider('b', { getTxHex: secondary })])
    expect(await provider.getTxHex(TXID)).toBe('hex')
    expect(await provider.getTxHex(TXID)).toBe('hex')
    expect(primary).toHaveBeenCalledTimes(1) // 2回目は後回しにされたので、secondaryの成功で終わる
    expect(secondary).toHaveBeenCalledTimes(2)
  })

  it('does not fall back on an explicit broadcast rejection', async () => {
    const secondary = vi.fn(async () => TXID)
    const provider = fallbackProvider([
      fakeProvider('a', {
        broadcast: async () => {
          throw new MonaWalletError('broadcast_failed', 'min relay fee not met')
        },
      }),
      fakeProvider('b', { broadcast: secondary }),
    ])
    await expect(provider.broadcast('00')).rejects.toMatchObject({ code: 'broadcast_failed' })
    expect(secondary).not.toHaveBeenCalled()
  })
})

describe('esploraProvider', () => {
  it('maps UTXOs and broadcast results', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/utxo'))
        return Response.json([
          { txid: TXID, vout: 1, value: 1234, status: { confirmed: true } },
          { txid: TXID, vout: 2, value: 5, status: { confirmed: false } },
        ])
      return new Response(`${TXID}\n`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const provider = esploraProvider({ endpoint: 'https://esplora.test/api/' })
    expect(await provider.getUtxos('Maddr')).toEqual({
      utxos: [
        { txid: TXID, vout: 1, value: 1234, confirmed: true },
        { txid: TXID, vout: 2, value: 5, confirmed: false },
      ],
      includesMempool: true,
    })
    expect(await provider.broadcast('00')).toBe(TXID)
  })

  it('classifies HTTP errors', async () => {
    vi.stubGlobal('fetch', async () => new Response('bad-txns-inputs-missingorspent', { status: 400 }))
    const provider = esploraProvider({ endpoint: 'https://esplora.test/api/' })
    await expect(provider.broadcast('00')).rejects.toMatchObject({ code: 'broadcast_failed' })
    await expect(provider.getTxHex(TXID)).rejects.toMatchObject({ code: 'network_error' })
  })
})

describe('monapartyProvider', () => {
  it('converts amounts to satoshi and reports no mempool support', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ result: [{ uxtos: [{ txid: TXID, vout: 0, amount: '0.29', confirmations: 3 }] }] }))
    const provider = monapartyProvider({ endpoints: ['https://monaparty.test/_api'] })
    expect(await provider.getUtxos('Maddr')).toEqual({
      utxos: [{ txid: TXID, vout: 0, value: 29_000_000, confirmed: true }],
      includesMempool: false,
    })
  })

  it('tries the next endpoint when one is unreachable', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('first')) throw new TypeError('fetch failed')
      return Response.json({ result: TXID })
    })
    vi.stubGlobal('fetch', fetchMock)
    const provider = monapartyProvider({ endpoints: ['https://first.test/_api', 'https://second.test/_api'] })
    expect(await provider.broadcast('00')).toBe(TXID)
  })
})
