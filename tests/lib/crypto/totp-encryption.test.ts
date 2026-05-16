import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomBytes } from 'crypto'
import { encryptSecret, decryptSecret } from '@/lib/crypto/totp-encryption'

// ============================================
// totp-encryption — AES-256-GCM 對稱加密
// ============================================
// 純函式（非同步 IO 都沒有）、只依賴 process.env.AMADEUS_TOTP_ENCRYPTION_KEY。
// 測試重點：
//   1. encrypt → decrypt round-trip 正確
//   2. 同 plaintext 加兩次、ciphertext 不同（IV 隨機）
//   3. env 缺失 / key 長度錯 → 拋對應錯誤
//   4. tampered ciphertext / 換 key → decrypt 失敗
//   5. encoded 太短 → 拋「長度異常」

const ORIGINAL_KEY = process.env.AMADEUS_TOTP_ENCRYPTION_KEY

function setKey(key: string | undefined): void {
  if (key === undefined) {
    delete process.env.AMADEUS_TOTP_ENCRYPTION_KEY
  } else {
    process.env.AMADEUS_TOTP_ENCRYPTION_KEY = key
  }
}

function makeValidKey(): string {
  return randomBytes(32).toString('base64')
}

describe('encryptSecret + decryptSecret - round-trip', () => {
  let validKey: string

  beforeEach(() => {
    validKey = makeValidKey()
    setKey(validKey)
  })

  afterEach(() => {
    setKey(ORIGINAL_KEY)
  })

  it('round-trip：encrypt 後 decrypt 回原文', () => {
    const plaintext = 'JBSWY3DPEHPK3PXP'
    const encoded = encryptSecret(plaintext)
    const decoded = decryptSecret(encoded)
    expect(decoded).toBe(plaintext)
  })

  it('encrypt 結果是合法 base64 字串', () => {
    const encoded = encryptSecret('hello')
    expect(encoded).toMatch(/^[A-Za-z0-9+/]+=*$/)
    // base64 decode 不應拋錯
    expect(() => Buffer.from(encoded, 'base64')).not.toThrow()
  })

  it('encrypt 兩次同 plaintext → ciphertext 不同（IV 隨機）', () => {
    const plaintext = 'same-secret'
    const a = encryptSecret(plaintext)
    const b = encryptSecret(plaintext)
    expect(a).not.toBe(b)
    // 但兩個 decrypt 都應拿回原文
    expect(decryptSecret(a)).toBe(plaintext)
    expect(decryptSecret(b)).toBe(plaintext)
  })

  it('支援 UTF-8 多字節字元（中文 / emoji）', () => {
    const samples = [
      '中文密碼',
      '混合 Mixed 123 ABC',
      'emoji 🔐 test',
      '',
    ]
    for (const s of samples) {
      expect(decryptSecret(encryptSecret(s))).toBe(s)
    }
  })

  it('支援很長的 plaintext', () => {
    const long = 'x'.repeat(10000)
    expect(decryptSecret(encryptSecret(long))).toBe(long)
  })

  it('encoded 包含 IV(12) + tag(16) + ciphertext、長度 ≥ 28', () => {
    const encoded = encryptSecret('a')
    const buf = Buffer.from(encoded, 'base64')
    // 12 (IV) + 16 (tag) + ≥1 (ciphertext) = ≥29
    expect(buf.length).toBeGreaterThanOrEqual(29)
  })
})

describe('encryptSecret + decryptSecret - env errors', () => {
  afterEach(() => {
    setKey(ORIGINAL_KEY)
  })

  it('env 未設 → encrypt 拋錯', () => {
    setKey(undefined)
    expect(() => encryptSecret('a')).toThrow(/AMADEUS_TOTP_ENCRYPTION_KEY env 未設定/)
  })

  it('env 未設 → decrypt 拋錯', () => {
    setKey(undefined)
    expect(() => decryptSecret('YQ==')).toThrow(/AMADEUS_TOTP_ENCRYPTION_KEY env 未設定/)
  })

  it('key 長度不是 32 bytes → 拋錯（太短）', () => {
    setKey(Buffer.alloc(16).toString('base64')) // 16 bytes、不夠
    expect(() => encryptSecret('a')).toThrow(/必須是 32 bytes base64/)
  })

  it('key 長度不是 32 bytes → 拋錯（太長）', () => {
    setKey(Buffer.alloc(64).toString('base64')) // 64 bytes、超過
    expect(() => encryptSecret('a')).toThrow(/必須是 32 bytes base64/)
  })

  it('key 是空字串 → 拋「未設定」（空字串 falsy）', () => {
    setKey('')
    expect(() => encryptSecret('a')).toThrow(/未設定/)
  })
})

describe('decryptSecret - tampering / corruption', () => {
  let validKey: string

  beforeEach(() => {
    validKey = makeValidKey()
    setKey(validKey)
  })

  afterEach(() => {
    setKey(ORIGINAL_KEY)
  })

  it('encoded 長度 < 28 (IV+tag) → 拋「長度異常」', () => {
    const tooShort = Buffer.alloc(20).toString('base64')
    expect(() => decryptSecret(tooShort)).toThrow(/長度異常/)
  })

  it('tampered ciphertext → decrypt 拋錯（GCM auth tag 失敗）', () => {
    const plaintext = 'top-secret'
    const encoded = encryptSecret(plaintext)
    const buf = Buffer.from(encoded, 'base64')
    // 翻轉最後一個 byte（ciphertext 段）
    buf[buf.length - 1] ^= 0xff
    const tampered = buf.toString('base64')
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('tampered tag → decrypt 拋錯', () => {
    const plaintext = 'top-secret'
    const encoded = encryptSecret(plaintext)
    const buf = Buffer.from(encoded, 'base64')
    // 翻轉 tag 段（IV 12 byte 之後的 16 byte）
    buf[12] ^= 0xff
    const tampered = buf.toString('base64')
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('用不同 key decrypt → 拋錯', () => {
    const plaintext = 'top-secret'
    const encoded = encryptSecret(plaintext)
    // 換 key
    setKey(makeValidKey())
    expect(() => decryptSecret(encoded)).toThrow()
  })

  it('完全亂數的 base64 → 拋錯', () => {
    const garbage = randomBytes(40).toString('base64')
    expect(() => decryptSecret(garbage)).toThrow()
  })
})
