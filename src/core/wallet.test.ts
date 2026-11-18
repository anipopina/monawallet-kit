import { sha256 } from '@noble/hashes/sha2.js'
import { hex } from '@scure/base'
import * as btcSigner from '@scure/btc-signer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatSignInMessage } from '../auth/challenge'
import { KEY_VECTORS } from './__tests__/vectors'
import { addressToScript } from './address'
import { MONA_NETWORK } from './constants'
import { verifyMessage } from './message'
import type { ChainProvider, Utxo } from './providers'
import { MonaWallet } from './wallet'

const prfMock = vi.hoisted(() => ({ entropyHex: '' }))
vi.mock('./passkey', () => ({
  checkPrfSupport: async () => ({ status: 'supported' }),
  createPasskey: async () => ({ prfEnabled: true }),
  evaluatePrf: async () => hex.decode(prfMock.entropyHex),
}))

const [V0, V1] = KEY_VECTORS as [(typeof KEY_VECTORS)[0], (typeof KEY_VECTORS)[0]]
const RECIPIENT = V1.address

/** nonWitnessUtxoとして検証が通る、実在形式の入金トランザクションを作る */
function fundingTx(toAddress: string, value: number, seed: number): { txid: string; txHex: string } {
  const raw = btcSigner.RawTx.encode({
    version: 2,
    segwitFlag: false,
    inputs: [{ txid: new Uint8Array(32).fill(seed), index: 0, finalScriptSig: new Uint8Array(0), sequence: 0xffffffff }],
    outputs: [{ amount: BigInt(value), script: addressToScript(toAddress) }],
    witnesses: [],
    lockTime: 0,
  })
  return { txid: hex.encode(sha256(sha256(raw)).reverse()), txHex: hex.encode(raw) }
}

class FakeProvider implements ChainProvider {
  name = 'fake'
  utxos: Utxo[] = []
  txs = new Map<string, string>()
  broadcasts: string[] = []

  fund(address: string, value: number, confirmed = true) {
    const { txid, txHex } = fundingTx(address, value, this.txs.size + 1)
    this.txs.set(txid, txHex)
    this.utxos.push({ txid, vout: 0, value, confirmed })
  }
  async getUtxos() {
    return { utxos: this.utxos.map((u) => ({ ...u })), includesMempool: true }
  }
  async getTxHex(txid: string) {
    const txHex = this.txs.get(txid)
    if (!txHex) throw new Error('unknown tx')
    return txHex
  }
  async broadcast(txHex: string) {
    this.broadcasts.push(txHex)
    return btcSigner.Transaction.fromRaw(hex.decode(txHex)).id
  }
}

let provider: FakeProvider
let wallet: MonaWallet

beforeEach(() => {
  prfMock.entropyHex = V0.entropyHex
  provider = new FakeProvider()
  wallet = new MonaWallet({ rpId: 'localhost', rpName: 'Test', provider })
})

describe('connection state', () => {
  it('connects, locks and disconnects', async () => {
    const snapshots: string[] = []
    wallet.subscribe((s) => snapshots.push(s.state))
    expect(wallet.state).toBe('disconnected')
    expect(await wallet.connect()).toBe(V0.address)
    expect(wallet.state).toBe('unlocked')
    expect(wallet.revealMnemonic()).toBe(V0.mnemonic)
    wallet.lock()
    expect(wallet.state).toBe('readonly')
    expect(wallet.address).toBe(V0.address)
    expect(() => wallet.revealMnemonic()).toThrow(expect.objectContaining({ code: 'locked' }))
    wallet.disconnect()
    expect(wallet.getSnapshot()).toMatchObject({ state: 'disconnected', address: null, balance: null })
    expect(snapshots).toContain('unlocked')
  })

  it('does not expose secrets through public state', async () => {
    await wallet.connect()
    const json = JSON.stringify({ wallet, snapshot: wallet.getSnapshot() })
    expect(json).not.toContain(V0.mnemonic.split(' ')[0]! + ' ')
    expect(Object.keys(wallet)).not.toContain('privateKey')
  })

  it('refuses to unlock a read-only wallet with a different passkey', async () => {
    wallet.openReadOnly(V0.address)
    prfMock.entropyHex = V1.entropyHex
    await expect(wallet.connect()).rejects.toMatchObject({ code: 'address_mismatch' })
    expect(wallet.state).toBe('readonly')
    expect(wallet.address).toBe(V0.address)
  })

  it('checks expectedAddress', async () => {
    await expect(wallet.connect({ expectedAddress: V1.address })).rejects.toMatchObject({ code: 'address_mismatch' })
    expect(wallet.state).toBe('disconnected')
  })
})

describe('balance and send', () => {
  it('builds, signs and broadcasts a P2PKH transaction, then tracks change locally', async () => {
    provider.fund(V0.address, 10_000_000)
    provider.fund(V0.address, 3_000_000, false)
    await wallet.connect()
    const balance = await wallet.refreshBalance()
    expect(balance).toMatchObject({ confirmedSat: 10_000_000, unconfirmedSat: 3_000_000, totalSat: 13_000_000 })

    const plan = await wallet.prepareSend({ to: RECIPIENT, amount: '0.029' })
    expect(plan).toMatchObject({ from: V0.address, to: RECIPIENT, amountSat: 2_900_000, inputCount: 1 })
    expect(plan.totalSat).toBe(plan.amountSat + plan.feeSat)
    expect(plan.changeSat).toBe(10_000_000 - plan.totalSat) // 承認済みUTXOを優先

    const { txid } = await wallet.send(plan)
    expect(provider.broadcasts).toHaveLength(1)
    const tx = btcSigner.Transaction.fromRaw(hex.decode(provider.broadcasts[0]!))
    expect(tx.id).toBe(txid)
    expect(btcSigner.Address(MONA_NETWORK).encode(btcSigner.OutScript.decode(tx.getOutput(0).script!))).toBe(RECIPIENT)
    expect(tx.getOutput(0).amount).toBe(2_900_000n)
    expect(tx.getOutput(1).amount).toBe(BigInt(plan.changeSat))

    // APIに未反映でも、使った入力は除外され、お釣りが未承認として加わる
    expect(wallet.balance).toMatchObject({ confirmedSat: 0, unconfirmedSat: 3_000_000 + plan.changeSat })
    await wallet.refreshBalance()
    expect(wallet.balance).toMatchObject({ confirmedSat: 0, unconfirmedSat: 3_000_000 + plan.changeSat })

    // お釣りを使って続けて送金できる（前トランザクションはローカルのtxHexを使う）
    const plan2 = await wallet.prepareSend({ to: RECIPIENT, amountSat: 5_000_000 })
    await wallet.send(plan2)
    expect(provider.broadcasts).toHaveLength(2)
  })

  it('rejects reused, stale or unsigned plans', async () => {
    provider.fund(V0.address, 10_000_000)
    provider.fund(V0.address, 10_000_000)
    await wallet.connect()
    const plan = await wallet.prepareSend({ to: RECIPIENT, amount: '0.01' })
    const other = await wallet.prepareSend({ to: RECIPIENT, amount: '0.01' })
    await wallet.send(plan)
    await expect(wallet.send(plan)).rejects.toMatchObject({ code: 'stale_plan' })
    await expect(wallet.send(other)).rejects.toMatchObject({ code: 'stale_plan' }) // 同じ入力を使い済み
    await expect(wallet.send({ ...plan })).rejects.toMatchObject({ code: 'stale_plan' }) // 改変・複製したplan

    const plan3 = await wallet.prepareSend({ to: RECIPIENT, amount: '0.01' })
    wallet.lock()
    await expect(wallet.send(plan3)).rejects.toMatchObject({ code: 'locked' })
  })

  it('validates send requests', async () => {
    provider.fund(V0.address, 10_000_000)
    const limited = new MonaWallet({ rpId: 'localhost', rpName: 'Test', provider, maxSendSat: 1_000_000 })
    await limited.connect()
    await expect(limited.prepareSend({ to: 'invalid', amount: '0.001' })).rejects.toMatchObject({ code: 'invalid_address' })
    await expect(limited.prepareSend({ to: RECIPIENT, amount: '0.1' })).rejects.toMatchObject({ code: 'amount_exceeds_limit' })
    await expect(limited.prepareSend({ to: RECIPIENT, amountSat: 546 })).rejects.toMatchObject({ code: 'amount_too_small' })
    await expect(limited.prepareSend({ to: RECIPIENT, amount: '0.001', amountSat: 1 })).rejects.toMatchObject({ code: 'invalid_amount' })
  })
})

describe('signing', () => {
  const origin = 'https://app.example'
  const challenge = (address: string, expiresInMs = 60_000) =>
    formatSignInMessage({
      appName: 'Example',
      address,
      origin,
      nonce: 'abc',
      issuedAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + expiresInMs),
    })

  it('signs messages verifiable by address', async () => {
    await wallet.connect()
    expect(verifyMessage('hello', V0.address, wallet.signMessage('hello'))).toBe(true)
  })

  it('signs only sign-in challenges that match origin, address and expiry', async () => {
    await wallet.connect()
    const message = challenge(V0.address)
    expect(verifyMessage(message, V0.address, wallet.signInChallenge(message, { origin }))).toBe(true)
    expect(() => wallet.signMessage(message)).toThrow(expect.objectContaining({ code: 'invalid_message' }))
    expect(() => wallet.signInChallenge(message, { origin: 'https://evil.example' })).toThrow(
      expect.objectContaining({ code: 'challenge_mismatch' }),
    )
    expect(() => wallet.signInChallenge(challenge(V1.address), { origin })).toThrow(expect.objectContaining({ code: 'challenge_mismatch' }))
    expect(() => wallet.signInChallenge(challenge(V0.address, -1), { origin })).toThrow(
      expect.objectContaining({ code: 'challenge_expired' }),
    )
  })

  it('requires an unlocked wallet', () => {
    wallet.openReadOnly(V0.address)
    expect(() => wallet.signMessage('hello')).toThrow(expect.objectContaining({ code: 'locked' }))
  })
})
