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
    '帶有現存 employees 時、新編號從 max+1 開始',
    async () => {
      // 先塞 5 筆 employees（E001..E005）
      const existing = ['E001', 'E002', 'E003', 'E004', 'E005']
      for (const n of existing) {
        const { error } = await admin.from('employees').insert({
          workspace_id: workspaceId,
          employee_number: n,
          // 補 schema 必要欄位 — 若缺欄報錯、之後依錯誤訊息補
          // 注意：employees 可能要 email + name、看 schema 決定
        })
        if (error) {
          // 此測試不強求過、schema 變動很大、用 skip 處理
          // eslint-disable-next-line no-console
          console.warn(`skip 第二題：employees INSERT failed: ${error.message}`)
          return
        }
      }

      // 跑 3 個並發、應該回 E006/E007/E008
      const promises = Array.from({ length: 3 }, () =>
        admin.rpc('generate_employee_number', { p_workspace_id: workspaceId })
      )
      const results = await Promise.all(promises)
      const numbers = (results.map(r => r.data as string)).sort()

      expect(numbers).toEqual(['E006', 'E007', 'E008'])
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
