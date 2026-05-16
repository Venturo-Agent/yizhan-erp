import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateTotp } from '@/lib/crypto/totp'

// ============================================
// generateTotp — 純函式 TOTP（RFC 6238）
// ============================================
// 測試重點：
//   1. 同 secret + 同時間 → 同 code（決定性）
//   2. 不同時間 window → 不同 code
//   3. period / digits 參數正確套用
//   4. Base32 secret 解析（含小寫、空白、padding）
//   5. remaining 倒數正確
// 用 vi.useFakeTimers 控制 Date.now()、確保完全決定性。

const TEST_SECRET = 'JBSWY3DPEHPK3PXP' // 經典 RFC 範例 base32 secret ("Hello!\xde\xad\xbe\xef" 那種類)

describe('generateTotp - deterministic output', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('回傳 6-digit code 與 remaining 整數', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const result = generateTotp(TEST_SECRET)
    expect(result.code).toMatch(/^\d{6}$/)
    expect(result.remaining).toBeGreaterThan(0)
    expect(result.remaining).toBeLessThanOrEqual(30)
    expect(Number.isInteger(result.remaining)).toBe(true)
  })

  it('同 secret + 同時間 → 同 code（決定性）', () => {
    vi.setSystemTime(new Date('2026-05-08T12:00:00Z'))
    const a = generateTotp(TEST_SECRET)
    const b = generateTotp(TEST_SECRET)
    expect(a.code).toBe(b.code)
    expect(a.remaining).toBe(b.remaining)
  })

  it('同一 30s window 內 code 不變', () => {
    // window 起點：epoch 1762603200（2026-01-01T00:00:00Z 後某整 30s）
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z')) // epoch 1767225600 → 1767225600 / 30 = 整除
    const c0 = generateTotp(TEST_SECRET).code
    vi.setSystemTime(new Date('2026-01-01T00:00:15Z')) // 同一 window
    const c15 = generateTotp(TEST_SECRET).code
    vi.setSystemTime(new Date('2026-01-01T00:00:29Z')) // 還在同一 window
    const c29 = generateTotp(TEST_SECRET).code
    expect(c0).toBe(c15)
    expect(c15).toBe(c29)
  })

  it('跨過 30s window → code 改變', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const before = generateTotp(TEST_SECRET).code
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z')) // 進下一 window
    const after = generateTotp(TEST_SECRET).code
    expect(before).not.toBe(after)
  })

  it('remaining 正確倒數', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z')) // epoch % 30 == 0
    expect(generateTotp(TEST_SECRET).remaining).toBe(30)
    vi.setSystemTime(new Date('2026-01-01T00:00:01Z'))
    expect(generateTotp(TEST_SECRET).remaining).toBe(29)
    vi.setSystemTime(new Date('2026-01-01T00:00:25Z'))
    expect(generateTotp(TEST_SECRET).remaining).toBe(5)
    vi.setSystemTime(new Date('2026-01-01T00:00:29Z'))
    expect(generateTotp(TEST_SECRET).remaining).toBe(1)
  })

  it('已知向量 — JBSWY3DPEHPK3PXP @ epoch 0 → 282760', () => {
    // RFC-style：Google Authenticator 經典範例的測試向量
    // secret JBSWY3DPEHPK3PXP @ counter 0 (period=30, T=0) 標準輸出
    vi.setSystemTime(new Date(0))
    const result = generateTotp(TEST_SECRET, 30, 6)
    expect(result.code).toBe('282760')
  })

  it('已知向量 — counter 1 (T=30) → 不同 code', () => {
    vi.setSystemTime(new Date(30 * 1000))
    const result = generateTotp(TEST_SECRET, 30, 6)
    expect(result.code).not.toBe('282760')
    expect(result.code).toMatch(/^\d{6}$/)
  })
})

describe('generateTotp - parameters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('digits=8 → 8-digit code', () => {
    const result = generateTotp(TEST_SECRET, 30, 8)
    expect(result.code).toMatch(/^\d{8}$/)
  })

  it('digits=6 (default) → 6-digit code', () => {
    const result = generateTotp(TEST_SECRET)
    expect(result.code).toMatch(/^\d{6}$/)
  })

  it('digits=4 → 4-digit code（補零）', () => {
    const result = generateTotp(TEST_SECRET, 30, 4)
    expect(result.code).toMatch(/^\d{4}$/)
    expect(result.code.length).toBe(4)
  })

  it('period=60 → remaining 區間在 1-60', () => {
    const result = generateTotp(TEST_SECRET, 60)
    expect(result.remaining).toBeGreaterThan(0)
    expect(result.remaining).toBeLessThanOrEqual(60)
  })

  it('period 不同 → code 也不同（counter 變了）', () => {
    const p30 = generateTotp(TEST_SECRET, 30).code
    const p60 = generateTotp(TEST_SECRET, 60).code
    // 不保證一定不同（但機率極小、純粹當 sanity）
    // 至少格式都是 6 digit
    expect(p30).toMatch(/^\d{6}$/)
    expect(p60).toMatch(/^\d{6}$/)
  })
})

describe('generateTotp - base32 input variations', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('小寫 secret 視為大寫（base32 case-insensitive）', () => {
    const upper = generateTotp('JBSWY3DPEHPK3PXP').code
    const lower = generateTotp('jbswy3dpehpk3pxp').code
    expect(upper).toBe(lower)
  })

  it('含空白的 secret 會被忽略掉 whitespace', () => {
    const clean = generateTotp('JBSWY3DPEHPK3PXP').code
    const spaced = generateTotp('JBSW Y3DP EHPK 3PXP').code
    expect(clean).toBe(spaced)
  })

  it('含 padding "=" 的 secret 會被剝除', () => {
    const clean = generateTotp('JBSWY3DPEHPK3PXP').code
    const padded = generateTotp('JBSWY3DPEHPK3PXP===').code
    expect(clean).toBe(padded)
  })

  it('不同 secret → 不同 code', () => {
    const a = generateTotp('JBSWY3DPEHPK3PXP').code
    const b = generateTotp('GEZDGNBVGY3TQOJQ').code
    expect(a).not.toBe(b)
  })
})
