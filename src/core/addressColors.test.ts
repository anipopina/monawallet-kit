import { describe, expect, it } from 'vitest'
import { addressColors } from './addressColors'

describe('addressColors', () => {
  it('returns the fixed palette for an address', () => {
    expect(addressColors('MBdpQaA3bFJQCrcKKsoZyDgc55FJY7Wkre')).toEqual([
      'hsl(346 64% 31%)',
      'hsl(313 77% 56%)',
      'hsl(192 62% 43%)',
      'hsl(239 80% 34%)',
      'hsl(84 67% 49%)',
      'hsl(58 77% 30%)',
      'hsl(33 79% 38%)',
      'hsl(240 72% 30%)',
    ])
    expect(addressColors('MBNQ6HS13uuQkX9m2RVB88vWeHd379PMJ2')).toEqual([
      'hsl(324 64% 42%)',
      'hsl(45 77% 51%)',
      'hsl(155 69% 51%)',
      'hsl(130 77% 51%)',
      'hsl(144 82% 35%)',
      'hsl(98 79% 55%)',
      'hsl(265 84% 31%)',
      'hsl(189 73% 50%)',
    ])
  })

  it('ignores the leading character shared by all P2PKH addresses', () => {
    // 先頭の 'M' 以外が同じなら同じ配色、2文字目以降が違えば1色目から変わる
    expect(addressColors('MBdpQaA3bFJQCrcKKs')[0]).toBe(addressColors('XBdpQaA3bFJQCrcKKs')[0])
    expect(addressColors('MBdpQaA3bFJQCrcKKs')[0]).not.toBe(addressColors('MCdpQaA3bFJQCrcKKs')[0])
  })

  it('always returns 8 colors', () => {
    expect(addressColors('')).toHaveLength(8)
  })
})
