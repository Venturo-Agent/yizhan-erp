/**
 * @vitest-environment node
 *
 * 並發壓測：generate_supplier_code RPC
 *
 * 同 employee-number-race.test.ts 結構、只是壓 supplier code（S00001 格式）。
 *
 * Why：
 *   PR-2 Phase 1 補了 generate_supplier_code（advisory lock）、本測試壓它。
 *   `suppliers.code` 之前是前端算 max+1、兩個分頁同時開會撞號 → unique 撞 → 失敗。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createSandboxWorkspace,
  hasServiceRoleKey,
  makeAdminClient,
  teardownSandboxWorkspace,
} from './helpers/setup'

describe.skipIf(!hasServiceRoleKey())('generate_supplier_code 並發競態', () => {
  let admin: SupabaseClient
  let workspaceId: string

  beforeAll(async () => {
    if (!hasServiceRoleKey()) return
    admin = makeAdminClient()
    const ws = await createSandboxWorkspace(admin, 'SUP-RACE')
    workspaceId = ws.id
  })

  afterAll(async () => {
    if (!workspaceId) return
    await teardownSandboxWorkspace(admin, workspaceId)
  })

  it(
    '10 並發 call → 回 10 個不同的 S00001-S00010',
    async () => {
      const N = 10
      const promises = Array.from({ length: N }, () =>
        admin.rpc('generate_supplier_code', { p_workspace_id: workspaceId })
      )
      const results = await Promise.all(promises)

      for (const r of results) {
        expect(r.error, `RPC 回 error: ${r.error?.message}`).toBeNull()
      }

      const codes = results.map(r => r.data as string)
      const unique = new Set(codes)
      expect(
        unique.size,
        `預期 ${N} 個不同編號、實際 ${unique.size} 個。codes: ${JSON.stringify(codes)}`
      ).toBe(N)

      const sorted = [...codes].sort()
      for (let i = 0; i < N; i++) {
        const expected = `S${String(i + 1).padStart(5, '0')}`
        expect(sorted[i]).toBe(expected)
      }
    },
    30_000
  )

  it(
    '不同 workspace 之間互不干擾（兩個 workspace 都從 S00001 開始）',
    async () => {
      // 已有 workspaceId = sandbox A
      // 再建 sandbox B、確認兩邊各自從 1 開始（advisory lock key 含 workspace_id）
      const wsB = await createSandboxWorkspace(admin, 'SUP-RACE-B')

      try {
        const [resA, resB] = await Promise.all([
          admin.rpc('generate_supplier_code', { p_workspace_id: workspaceId }),
          admin.rpc('generate_supplier_code', { p_workspace_id: wsB.id }),
        ])

        // 兩個 workspace 都應該回 S00001（互不干擾）
        // 注意：A 已被前一題用過、所以可能是 S00011；只要兩邊不同就 OK
        expect(resA.error).toBeNull()
        expect(resB.error).toBeNull()
        expect(resB.data).toBe('S00001')
      } finally {
        await teardownSandboxWorkspace(admin, wsB.id)
      }
    },
    30_000
  )

  it('p_workspace_id 為 NULL → RPC 應 raise exception', async () => {
    const { data, error } = await admin.rpc('generate_supplier_code', {
      p_workspace_id: null as unknown as string,
    })
    expect(data).toBeNull()
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/workspace_id is required/i)
  })
})
