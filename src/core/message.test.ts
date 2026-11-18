import { hex } from '@scure/base'
import { describe, expect, it } from 'vitest'
import { KEY_VECTORS } from './__tests__/vectors'
import { deriveKeysFromEntropy } from './keys'
import { signMessage, verifyMessage } from './message'

describe('message signing (compatibility with bitcoinjs-message)', () => {
  for (const v of KEY_VECTORS) {
    const keys = deriveKeysFromEntropy(hex.decode(v.entropyHex))
    for (const s of v.signatures) {
      const label = `${v.address} / ${s.message.slice(0, 12)}`

      it(`produces the same deterministic signature: ${label}`, () => {
        expect(signMessage(s.message, keys.privateKey, { extraEntropy: false })).toBe(s.signature)
      })

      it(`verifies signatures from bitcoinjs-message and the legacy wallet: ${label}`, () => {
        expect(verifyMessage(s.message, v.address, s.signature)).toBe(true)
        expect(verifyMessage(s.message, v.address, s.legacyHedgedSignature)).toBe(true)
      })
    }
  }

  const [first, second] = KEY_VECTORS
  const keys = deriveKeysFromEntropy(hex.decode(first!.entropyHex))

  it('round-trips hedged signatures', () => {
    const signature = signMessage('round trip', keys.privateKey)
    expect(verifyMessage('round trip', first!.address, signature)).toBe(true)
  })

  it('rejects a different message, address or malformed signature', () => {
    const signature = signMessage('original', keys.privateKey)
    expect(verifyMessage('tampered', first!.address, signature)).toBe(false)
    expect(verifyMessage('original', second!.address, signature)).toBe(false)
    expect(verifyMessage('original', 'not-an-address', signature)).toBe(false)
    expect(verifyMessage('original', first!.address, 'AAAA')).toBe(false)
    expect(verifyMessage('original', first!.address, '')).toBe(false)
  })
})
