import { hex } from '@scure/base'
import { describe, expect, it } from 'vitest'
import { KEY_VECTORS } from './__tests__/vectors'
import { deriveKeysFromEntropy, deriveKeysFromMnemonic, entropyToMnemonic } from './keys'

describe('key derivation (compatibility with monacube-old)', () => {
  for (const v of KEY_VECTORS) {
    it(`derives ${v.address}`, () => {
      const entropy = hex.decode(v.entropyHex)
      expect(entropyToMnemonic(entropy)).toBe(v.mnemonic)
      const keys = deriveKeysFromEntropy(entropy)
      expect(keys.address).toBe(v.address)
      expect(keys.privateKey).toHaveLength(32)
      expect(deriveKeysFromMnemonic(v.mnemonic).address).toBe(v.address)
    })
  }

  it('rejects entropy that is not 256 bits', () => {
    expect(() => deriveKeysFromEntropy(new Uint8Array(16))).toThrow()
  })
})
