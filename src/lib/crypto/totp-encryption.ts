import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const keyB64 = process.env.AMADEUS_TOTP_ENCRYPTION_KEY
  if (!keyB64) {
    throw new Error('AMADEUS_TOTP_ENCRYPTION_KEY env 未設定')
  }
  const key = Buffer.from(keyB64, 'base64')
  if (key.length !== 32) {
    throw new Error(
      'AMADEUS_TOTP_ENCRYPTION_KEY 必須是 32 bytes base64（用 openssl rand -base64 32 產生）'
    )
  }
  return key
}

export function encryptSecret(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

export function decryptSecret(encoded: string): string {
  const key = getKey()
  const buf = Buffer.from(encoded, 'base64')
  if (buf.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('加密資料長度異常')
  }
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}
