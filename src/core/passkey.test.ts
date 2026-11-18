import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { bufferSourceToBytes } from './passkey'

describe('bufferSourceToBytes', () => {
  it('copies ArrayBuffer and views', () => {
    const buffer = Uint8Array.from({ length: 40 }, (_, i) => i).buffer
    expect(bufferSourceToBytes(buffer)).toEqual(Uint8Array.from({ length: 40 }, (_, i) => i))
    expect(bufferSourceToBytes(new Uint8Array(buffer, 4, 32))).toEqual(Uint8Array.from({ length: 32 }, (_, i) => i + 4))
    expect(bufferSourceToBytes(new DataView(buffer, 8, 2))).toEqual(Uint8Array.of(8, 9))
  })

  it('accepts values from another realm (e.g. password manager extensions)', () => {
    const foreignBuffer = runInNewContext('const b = new Uint8Array(32); b[0] = 7; b.buffer') as ArrayBuffer
    expect(foreignBuffer instanceof ArrayBuffer).toBe(false)
    const bytes = bufferSourceToBytes(foreignBuffer)
    expect(bytes).toHaveLength(32)
    expect(bytes[0]).toBe(7)
    const foreignView = runInNewContext('new Uint8Array([1, 2, 3])') as Uint8Array<ArrayBuffer>
    expect(bufferSourceToBytes(foreignView)).toEqual(Uint8Array.of(1, 2, 3))
  })
})
