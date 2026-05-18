/**
 * @vitest-environment node
 *
 * 並發壓測：generate_employee_number RPC
 *
 * 模擬「10 個分頁同時按存」、確認 advisory lock 真的擋下競態：
 *   - 10 個並發 RPC call → 應該回 10 個不同的編號
 *   - 編號順序連續（E001..E010）、無跳號
 *
 * Why important：
 *   2026-05-12 William 測試發現「存檔有衝突」、根因之一是前端算編號無鎖。
 *   PR-2 Phase 1 補了 RPC + advisory lock、本測試壓它確保真的鎖住。
 *
 * 跑法：
 *   source ~/.config/venturo/secrets.env
 *   npm run test -- tests/concurrency/employee-number-race
 *
 * CI 接法：
 *   暫不接、要等 staging supabase + secrets injection 設好。
 *   參考 tests/concurrency.README.md（之後補）。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createSandboxWorkspace,
  hasServiceRoleKey,
  makeAdminClient,
  teardownSandboxWorkspace,
} from './helpers/setup'

const skipReason =
  '需 SUPABASE_SERVICE_ROLE_KEY、source ~/.config/venturo/secrets.env 後再跑'

describe.skipIf(!hasServiceRoleKey())('generate_employee_number 並發競態', () => {
  let admin: SupabaseClient
  let workspaceId: string

  beforeAll(async () => {
    if (!hasServiceRoleKey()) {
      console.warn(skipReason)
      return
    }
    admin = makeAdminClient()
    const ws = await createSandboxWorkspace(admin, 'EMP-RACE')
    workspaceId = ws.id
  })

  afterAll(async () => {
    if (!workspaceId) return
    await teardownSandboxWorkspace(admin, workspaceId)
  })

  it(
    '10 並發 call → 回 10 個不同的 E001-E010',
    async () => {
      const N = 10
      const promises = Array.from({ length: N }, () =>
        admin.rpc('generate_employee_number', { p_workspace_id: workspaceId })
      )
      const results = await Promise.all(promises)

      // 所有 call 都要成功（不能有 error）
      for (const r of results) {
        expect(r.error, `RPC 回 error: ${r.error?.message}`).toBeNull()
      }

      const numbers = results.map(r => r.data as string)
      const unique = new Set(numbers)
      expect(
        unique.size,
        `預期 ${N} 個不同編號、實際 ${unique.size} 個。collisions: ${JSON.stringify(numbers)}`
      ).toBe(N)

      // 編號連續、無跳號（advisory lock 串行化、應該回 E001..E010）
      const sorted = [...numbers].sort()
      for (let i = 0; i < N; i++) {
        const expected = `E${String(i + 1).padStart(3, '0')}`
        expect(sorted[i]).toBe(expected)
      }
    },
    30_000 // 30 秒 timeout、給 advisory lock 串行化時間
  )

  it(
    '帶有現存 employees 時、新編號 > 現有 MAX 且連續',
    async () => {
      // 先塞 5 筆 employees（E001..E005）
      // 注意：新版 RPC 用 counter 表記憶「上次發到哪」、不只看 employees 表 MAX。
      // 所以即使 employees 表 MAX=5、若先前 RPC 已發到 E010、下一個會是 E011（不是 E006）。
      // 改 assertion：3 個新編號連續、unique、且 > 表 MAX（不檢查具體起點）。
      const existing = ['E001', 'E002', 'E003', 'E004', 'E005']
      for (const n of existing) {
        const { error } = await admin.from('employees').insert({
          workspace_id: workspaceId,
          employee_number: n,
        })
        if (error) {
          // eslint-disable-next-line no-console
          console.warn(`skip 第二題：employees INSERT failed: ${error.message}`)
          return
        }
      }

      // 跑 3 個並發
      const promises = Array.from({ length: 3 }, () =>
        admin.rpc('generate_employee_number', { p_workspace_id: workspaceId })
      )
      const results = await Promise.all(promises)
      const numbers = (results.map(r => r.data as string))
      const nums = numbers.map(n => parseInt(n.slice(1), 10)).sort((a, b) => a - b)

      // 3 個必須 unique
      expect(new Set(numbers).size).toBe(3)
      // 連續（n+1, n+2, n+3）
      expect(nums[1]).toBe(nums[0] + 1)
      expect(nums[2]).toBe(nums[1] + 1)
      // 必須 > 現有 MAX（E005 = 5）
      expect(nums[0]).toBeGreaterThan(5)
    },
    30_000
  )

  it('p_workspace_id 為 NULL → RPC 應 raise exception', async () => {
    const { data, error } = await admin.rpc('generate_employee_number', {
      p_workspace_id: null as unknown as string,
    })
    expect(data).toBeNull()
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/workspace_id is required/i)
  })
})
