import { createHmac } from 'crypto'

function base32ToBytes(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '')
  let bits = ''
  for (const c of cleaned) {
    const val = alphabet.indexOf(c)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

interface TotpResult {
  code: string
  remaining: number
}

export function generateTotp(secret: string, period = 30, digits = 6): TotpResult {
  const keyBytes = base32ToBytes(secret)
  const epoch = Math.floor(Date.now() / 1000)
  const counter = Math.floor(epoch / period)

  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))

  const hmac = createHmac('sha1', keyBytes).update(msg).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const code = String(codeInt % 10 ** digits).padStart(digits, '0')
  const remaining = period - (epoch % period)
  return { code, remaining }
}
