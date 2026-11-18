import { describe, expect, it } from 'vitest'
import { formatMona, parseMona } from './amount'

describe('parseMona', () => {
  it('parses decimal strings exactly', () => {
    expect(parseMona('0.29')).toBe(29_000_000) // 浮動小数点では 28999999 になるケース
    expect(parseMona('1')).toBe(100_000_000)
    expect(parseMona('0.00000001')).toBe(1)
    expect(parseMona(' 12.5 ')).toBe(1_250_000_000)
    expect(parseMona('1.10000000')).toBe(110_000_000)
  })

  it.each(['', '.', '1.', '.5', '-1', '1e-8', '0.000000001', '1,000', 'abc', '0x10', '１'])('rejects %j', (input) => {
    expect(() => parseMona(input)).toThrow(expect.objectContaining({ code: 'invalid_amount' }))
  })
})

describe('formatMona', () => {
  it('formats satoshi without floating point errors', () => {
    expect(formatMona(29_000_000)).toBe('0.29')
    expect(formatMona(1)).toBe('0.00000001')
    expect(formatMona(0)).toBe('0')
    expect(formatMona(123_456_789_012)).toBe('1234.56789012')
    expect(formatMona(150_000_000, { minFractionDigits: 2 })).toBe('1.50')
    expect(formatMona(-5_000)).toBe('-0.00005')
  })

  it('rejects non-integer satoshi', () => {
    expect(() => formatMona(0.5)).toThrow()
  })
})
