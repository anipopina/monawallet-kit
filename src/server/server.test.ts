import { hex } from '@scure/base'
import { describe, expect, it } from 'vitest'
import { KEY_VECTORS } from '../core/__tests__/vectors'
import { deriveKeysFromEntropy } from '../core/keys'
import { signMessage } from '../core/message'
import { createSignInChallenge, parseSignInMessage, verifySignIn } from './index'

const [V0, V1] = KEY_VECTORS as [(typeof KEY_VECTORS)[0], (typeof KEY_VECTORS)[0]]
const key0 = deriveKeysFromEntropy(hex.decode(V0.entropyHex)).privateKey
const expected = { appName: 'Example', origin: ['https://app.example', 'http://localhost:5173'] }

/** 発行済みnonceを1回だけ受け付けるストア（アプリ側実装の例） */
function nonceStore() {
  const issued = new Map<string, { address: string; message: string }>()
  return {
    issue(c: { nonce: string; address: string; message: string }) {
      issued.set(c.nonce, { address: c.address, message: c.message })
    },
    consume: (nonce: string, c: { address: string; message: string }) => {
      const record = issued.get(nonce)
      if (!record || record.address !== c.address || record.message !== c.message) return false
      issued.delete(nonce)
      return true
    },
  }
}

describe('sign-in challenge', () => {
  it('creates a message in the legacy (monacube-old) format', () => {
    const c = createSignInChallenge({
      appName: 'Example',
      origin: 'https://app.example',
      address: V0.address,
      now: new Date('2026-01-02T03:04:05.678Z'),
    })
    expect(c.message).toBe(
      [
        'Example wants you to sign in with your Monacoin address:',
        V0.address,
        '',
        'Origin: https://app.example',
        `Nonce: ${c.nonce}`,
        'Issued At: 2026-01-02T03:04:05.000Z',
        'Expiration Time: 2026-01-02T03:09:05.000Z',
      ].join('\n'),
    )
    expect(c.nonce).toMatch(/^[0-9a-f]{32}$/)
    expect(parseSignInMessage(c.message)).toMatchObject({ address: V0.address, nonce: c.nonce })
    expect(parseSignInMessage(c.message + '\nextra')).toBeNull()
  })

  it('verifies a valid sign-in once', async () => {
    const store = nonceStore()
    const c = createSignInChallenge({ appName: 'Example', origin: 'http://localhost:5173', address: V0.address })
    store.issue(c)
    const signature = signMessage(c.message, key0)
    const params = { message: c.message, signature, address: V0.address, expected, consumeNonce: store.consume }
    await expect(verifySignIn(params)).resolves.toMatchObject({ address: V0.address })
    await expect(verifySignIn(params)).rejects.toMatchObject({ code: 'nonce_rejected' }) // リプレイ
  })

  it('rejects wrong service, address, expiry or signature', async () => {
    const consumeNonce = () => true
    const c = createSignInChallenge({ appName: 'Example', origin: 'https://app.example', address: V0.address })
    const signature = signMessage(c.message, key0)
    const base = { message: c.message, signature, expected, consumeNonce }

    await expect(verifySignIn({ ...base, expected: { ...expected, appName: 'Other' } })).rejects.toMatchObject({
      code: 'challenge_mismatch',
    })
    await expect(verifySignIn({ ...base, expected: { ...expected, origin: 'https://other.example' } })).rejects.toMatchObject({
      code: 'challenge_mismatch',
    })
    await expect(verifySignIn({ ...base, address: V1.address })).rejects.toMatchObject({ code: 'challenge_mismatch' })
    await expect(verifySignIn({ ...base, now: new Date(Date.now() + 10 * 60_000) })).rejects.toMatchObject({ code: 'challenge_expired' })
    await expect(
      verifySignIn({ ...base, signature: signMessage(c.message, deriveKeysFromEntropy(hex.decode(V1.entropyHex)).privateKey) }),
    ).rejects.toMatchObject({
      code: 'invalid_signature',
    })
    await expect(verifySignIn({ ...base, message: c.message.replace('Example', 'Exampl3') })).rejects.toMatchObject({
      code: 'challenge_mismatch',
    })
  })

  it('rejects non-P2PKH addresses when issuing', () => {
    expect(() => createSignInChallenge({ appName: 'Example', origin: 'https://app.example', address: 'invalid' })).toThrow(
      expect.objectContaining({ code: 'invalid_address' }),
    )
  })
})
