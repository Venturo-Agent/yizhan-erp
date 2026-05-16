import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock getServerAuth
const getServerAuthMock = vi.fn()
vi.mock('@/lib/auth/server-auth', () => ({
  getServerAuth: () => getServerAuthMock(),
}))

// Mock hasCapabilityByCode (dynamic imported)
const hasCapabilityByCodeMock = vi.fn()
vi.mock('@/app/api/lib/check-capability', () => ({
  hasCapabilityByCode: (...args: unknown[]) => hasCapabilityByCodeMock(...args),
}))

import { requireCapability } from '@/lib/auth/require-capability'

describe('requireCapability', () => {
  beforeEach(() => {
    getServerAuthMock.mockReset()
    hasCapabilityByCodeMock.mockReset()
  })

  describe('未登入', () => {
    it('回 401 + 「請先登入」', async () => {
      getServerAuthMock.mockResolvedValue({ success: false })

      const result = await requireCapability('tours.read')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.response.status).toBe(401)
        const body = await result.response.json()
        expect(body.error).toBe('請先登入')
      }
    })

    it('未登入時不檢查 capability', async () => {
      getServerAuthMock.mockResolvedValue({ success: false })

      await requireCapability('tours.read')

      expect(hasCapabilityByCodeMock).not.toHaveBeenCalled()
    })
  })

  describe('已登入但沒 capability', () => {
    it('回 403 + 顯示缺的 capability code', async () => {
      getServerAuthMock.mockResolvedValue({
        success: true,
        data: { employeeId: 'E001', workspaceId: 'W1' },
      })
      hasCapabilityByCodeMock.mockResolvedValue(false)

      const result = await requireCapability('payments.delete')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.response.status).toBe(403)
        const body = await result.response.json()
        expect(body.error).toBe('沒有 payments.delete 權限')
      }
    })

    it('用正確的 employeeId 跟 capability code 查', async () => {
      getServerAuthMock.mockResolvedValue({
        success: true,
        data: { employeeId: 'E007', workspaceId: 'W1' },
      })
      hasCapabilityByCodeMock.mockResolvedValue(false)

      await requireCapability('orders.create')

      expect(hasCapabilityByCodeMock).toHaveBeenCalledWith('E007', 'orders.create')
    })
  })

  describe('已登入且有 capability', () => {
    it('回 ok=true + 帶出 workspaceId / employeeId', async () => {
      getServerAuthMock.mockResolvedValue({
        success: true,
        data: { employeeId: 'E001', workspaceId: 'W42' },
      })
      hasCapabilityByCodeMock.mockResolvedValue(true)

      const result = await requireCapability('tours.read')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.workspaceId).toBe('W42')
        expect(result.employeeId).toBe('E001')
      }
    })
  })

  describe('邊界 / 安全', () => {
    it('capability code 是空字串時、仍會 call hasCapabilityByCode（讓 DB 決定）', async () => {
      getServerAuthMock.mockResolvedValue({
        success: true,
        data: { employeeId: 'E001', workspaceId: 'W1' },
      })
      hasCapabilityByCodeMock.mockResolvedValue(false)

      await requireCapability('')

      expect(hasCapabilityByCodeMock).toHaveBeenCalledWith('E001', '')
    })

    it('hasCapabilityByCode 回 false 必擋（不能 fall-through）', async () => {
      getServerAuthMock.mockResolvedValue({
        success: true,
        data: { employeeId: 'E001', workspaceId: 'W1' },
      })
      hasCapabilityByCodeMock.mockResolvedValue(false)

      const result = await requireCapability('any.thing')

      expect(result.ok).toBe(false)
    })
  })
})
