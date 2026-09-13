import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../../src/lib/password.js'

describe('password hashing', () => {
  it('round-trips and rejects wrong passwords', async () => {
    const h = await hashPassword('correct horse battery')
    expect(h.startsWith('scrypt$32768$8$1$')).toBe(true)
    expect(await verifyPassword('correct horse battery', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })

  it('produces distinct hashes for the same password (random salt)', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'))
  })

  it('rejects malformed stored values without throwing', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false)
    expect(await verifyPassword('x', 'bcrypt$whatever')).toBe(false)
  })

  it('accepts the timing-equalisation dummy hash and rejects against it', async () => {
    const dummy = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    expect(await verifyPassword('anything', dummy)).toBe(false)
  })
})
