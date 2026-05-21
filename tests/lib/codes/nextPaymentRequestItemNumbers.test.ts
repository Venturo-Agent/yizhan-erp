/**
 * nextPaymentRequestItemNumbers - 批次拿 N 個 payment_request_item item_number
 *
 * 修原 in-loop 呼叫 single RPC 撞 unique constraint 的 bug（5/21 William 拍板方案 A）。
 * 對應 migration 20260521061500_add_batch_next_payment_request_item_numbers.
 */

import { describe, it, expect, vi } from 'vitest'
import { nextPaymentRequestItemNumbers } from '@/lib/codes'

type RpcCall = { fn: string; params: Record<string, unknown> }

function makeMockClient(returnValue: string[] | null, error: Error | null = null) {
  const calls: RpcCall[] = []
  const rpc = vi.fn((fn: string, params: Record<string, unknown>) => {
    calls.push({ fn, params })
    return Promise.resolve({ data: returnValue, error })
  })
  return { rpc, calls } as unknown as { rpc: ReturnType<typeof vi.fn>; calls: RpcCall[] }
}

describe('nextPaymentRequestItemNumbers', () => {
  it('count = 0 → 直接回空陣列、不呼叫 RPC', async () => {
    const mock = makeMockClient(null)
    const result = await nextPaymentRequestItemNumbers(
      'aaaa-1111',
      0,
      mock as unknown as Parameters<typeof nextPaymentRequestItemNumbers>[2]
    )
    expect(result).toEqual([])
    expect(mock.rpc).not.toHaveBeenCalled()
  })

  it('count < 0 → 直接回空陣列、不呼叫 RPC', async () => {
    const mock = makeMockClient(null)
    const result = await nextPaymentRequestItemNumbers(
      'aaaa-1111',
      -5,
      mock as unknown as Parameters<typeof nextPaymentRequestItemNumbers>[2]
    )
    expect(result).toEqual([])
    expect(mock.rpc).not.toHaveBeenCalled()
  })

  it('count = 1 → 回 1 個編號', async () => {
    const mock = makeMockClient(['TYO241218A-R01-3'])
    const result = await nextPaymentRequestItemNumbers(
      'req-1',
      1,
      mock as unknown as Parameters<typeof nextPaymentRequestItemNumbers>[2]
    )
    expect(result).toEqual(['TYO241218A-R01-3'])
    expect(mock.rpc).toHaveBeenCalledOnce()
    expect(mock.calls[0]).toEqual({
      fn: 'next_payment_request_item_numbers',
      params: { p_request_id: 'req-1', p_count: 1 },
    })
  })

  it('count = 5 → 回 5 個各自不同的編號', async () => {
    const expected = [
      'PEK260630A-I01-1',
      'PEK260630A-I01-2',
      'PEK260630A-I01-3',
      'PEK260630A-I01-4',
      'PEK260630A-I01-5',
    ]
    const mock = makeMockClient(expected)
    const result = await nextPaymentRequestItemNumbers(
      'req-2',
      5,
      mock as unknown as Parameters<typeof nextPaymentRequestItemNumbers>[2]
    )
    expect(result).toEqual(expected)
    // 重要：呼叫 RPC 1 次、不是 5 次 in-loop（避免撞 unique）
    expect(mock.rpc).toHaveBeenCalledOnce()
    expect(mock.calls[0].params).toEqual({ p_request_id: 'req-2', p_count: 5 })
  })

  it('RPC 回 null → throw error', async () => {
    const mock = makeMockClient(null)
    await expect(
      nextPaymentRequestItemNumbers(
        'req-3',
        2,
        mock as unknown as Parameters<typeof nextPaymentRequestItemNumbers>[2]
      )
    ).rejects.toThrow('next_payment_request_item_numbers returned null')
  })

  it('RPC 回 error → throw error', async () => {
    const dbError = new Error('payment_request not found')
    const mock = makeMockClient(null, dbError)
    await expect(
      nextPaymentRequestItemNumbers(
        'req-fake',
        2,
        mock as unknown as Parameters<typeof nextPaymentRequestItemNumbers>[2]
      )
    ).rejects.toThrow('payment_request not found')
  })
})
