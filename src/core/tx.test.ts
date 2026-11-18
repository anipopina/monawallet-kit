import { describe, expect, it } from 'vitest'
import { DUST_THRESHOLD_SAT } from './constants'
import { estimateFeeSat, selectCoins } from './tx'
import type { Utxo } from './providers'

const RATE = 200
const utxo = (value: number, confirmed = true, n = 0): Utxo => ({ txid: String(n).padStart(64, '0'), vout: 0, value, confirmed })

describe('estimateFeeSat', () => {
  it('estimates P2PKH transaction size', () => {
    // 148 * 1 + 34 * 2 + 10 = 226 vB
    expect(estimateFeeSat(1, 2, RATE)).toBe(45_200)
  })
})

describe('selectCoins', () => {
  it('returns change when it is above dust', () => {
    const result = selectCoins([utxo(1_000_000)], 100_000, RATE)
    expect(result.inputs).toHaveLength(1)
    expect(result.feeSat).toBe(45_200)
    expect(result.changeSat).toBe(1_000_000 - 100_000 - 45_200)
  })

  it('keeps adding inputs until the fee is covered (fee grows with each input)', () => {
    const utxos = Array.from({ length: 10 }, (_, i) => utxo(100_000, true, i))
    const amount = 500_000
    const result = selectCoins(utxos, amount, RATE)
    const inputTotal = result.inputs.reduce((s, u) => s + u.value, 0)
    expect(inputTotal).toBe(amount + result.feeSat + result.changeSat)
    expect(result.feeSat).toBeGreaterThanOrEqual(estimateFeeSat(result.inputs.length, result.changeSat ? 2 : 1, RATE))
    expect(result.inputs.length).toBe(8)
  })

  it('drops dust change into the fee', () => {
    const amount = 100_000
    const fee1 = estimateFeeSat(1, 1, RATE)
    const result = selectCoins([utxo(amount + fee1 + 100)], amount, RATE)
    expect(result.changeSat).toBe(0)
    expect(result.feeSat).toBe(fee1 + 100)
  })

  it('never creates change at or below the dust threshold', () => {
    for (let extra = 0; extra < 10_000; extra += 37) {
      const amount = 200_000
      const value = amount + estimateFeeSat(1, 2, RATE) + extra
      const result = selectCoins([utxo(value)], amount, RATE)
      expect(result.changeSat === 0 || result.changeSat > DUST_THRESHOLD_SAT).toBe(true)
      expect(result.feeSat + result.changeSat + amount).toBe(value)
    }
  })

  it('prefers confirmed outputs', () => {
    const result = selectCoins([utxo(5_000_000, false, 1), utxo(1_000_000, true, 2)], 100_000, RATE)
    expect(result.inputs[0]!.confirmed).toBe(true)
  })

  it('throws insufficient_funds', () => {
    expect(() => selectCoins([utxo(100_000)], 100_000, RATE)).toThrow(expect.objectContaining({ code: 'insufficient_funds' }))
    expect(() => selectCoins([], 1_000, RATE)).toThrow(expect.objectContaining({ code: 'insufficient_funds' }))
  })
})
