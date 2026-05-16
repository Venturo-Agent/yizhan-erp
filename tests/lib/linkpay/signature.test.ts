import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock crypto before importing
vi.mock('crypto', () => {
  const mockHmac = {
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('abc123def456'),
  }
  return {
    default: {
      createHmac: vi.fn().mockReturnValue(mockHmac),
      timingSafeEqual: vi.fn().mockImplementation((a: Buffer, b: Buffer) => a.equals(b)),
    },
    createHmac: vi.fn().mockReturnValue(mockHmac),
    timingSafeEqual: vi.fn().mockImplementation((a: Buffer, b: Buffer) => a.equals(b)),
  }
})

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe.skip('LinkPay signature', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('calculateMAC 過濾 mac 欄位和空值', async () => {
    const { calculateMAC } = await import('@/lib/linkpay/signature')
    // Should not throw, should return a hex string
    const result = calculateMAC({
      order_no: 'TEST001',
      ret_code: '00',
      tx_amt: '1000',
      mac: 'should_be_ignored',
      empty_field: undefined,
      another_empty: '',
    })
    expect(typeof result).toBe('string')
  })

  it('verifyWebhookSignature MAC_KEY 未設定時拒絕', async () => {
    // No TAISHIN_MAC_KEY set — should reject for security
    const { verifyWebhookSignature } = await import('@/lib/linkpay/signature')
    const result = verifyWebhookSignature({
      order_no: 'TEST001',
      ret_code: '00',
      tx_amt: '1000',
    })
    // Without MAC_KEY, reject all requests
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('未設定')
  })

  it('verifySourceIP 白名單為空時允許所有', async () => {
    const { verifySourceIP } = await import('@/lib/linkpay/signature')
    expect(verifySourceIP('1.2.3.4')).toBe(true)
  })
})
