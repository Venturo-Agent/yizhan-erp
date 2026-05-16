/**
 * @vitest-environment node
 *
 * 並發壓測：generate_account_child_code RPC
 *
 * 格式：{parent_code}-{N}（不補零）、per-(workspace, parent) scoped
 *
 * 例：parent_code = '1101'、回 '1101-1' / '1101-2' / ...
 *
 * Why：
 *   accounting/accounts/page.tsx 之前算 max+1、會撞號。
 *   PR-2 Phase 2 補 RPC + advisory lock。
 *   注意：chart_of_accounts.code 在 5/13 補了 UNIQUE constraint（B4）、
 *        所以即使 race 進來、DB 層也會再擋一層。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createSandboxWorkspace,
  hasServiceRoleKey,
  makeAdminClient,
  teardownSandboxWorkspace,
} from './helpers/setup'

describe.skipIf(!hasServiceRoleKey())('generate_account_child_code 並發競態', () => {
  let admin: SupabaseClient
  let workspaceId: string
  const PARENT_CODE = '1101'

  beforeAll(async () => {
    if (!hasServiceRoleKey()) return
    admin = makeAdminClient()
    const ws = await createSandboxWorkspace(admin, 'ACC-RACE')
    workspaceId = ws.id
  })

  afterAll(async () => {
    if (!workspaceId) return
    await teardownSandboxWorkspace(admin, workspaceId)
  })

  it(
    '10 並發 call、同 parent → 回 10 個不同的 {parent}-1 .. -10',
    async () => {
      const N = 10
      const promises = Array.from({ length: N }, () =>
        admin.rpc('generate_account_child_code', {
          p_workspace_id: workspaceId,
          p_parent_code: PARENT_CODE,
        })
      )
      const results = await Promise.all(promises)

      for (const r of results) {
        expect(r.error, `RPC error: ${r.error?.message}`).toBeNull()
      }

      const codes = results.map(r => r.data as string)
      const unique = new Set(codes)
      expect(
        unique.size,
        `預期 ${N} 個不同、實際 ${unique.size}。codes: ${JSON.stringify(codes)}`
      ).toBe(N)

      // 排序後應該是 1101-1, 1101-10, 1101-2, ...（字串排序）
      // 比較好的驗法：parse 後比較整數
      const nums = codes
        .map(c => Number(c.replace(`${PARENT_CODE}-`, '')))
        .sort((a, b) => a - b)
      expect(nums).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    },
    30_000
  )

  it(
    '不同 parent_code 互不干擾',
    async () => {
      // 同一個 workspace 內、parent A 跟 parent B 應該各自從 1 開始
      const [resA, resB] = await Promise.all([
        admin.rpc('generate_account_child_code', {
          p_workspace_id: workspaceId,
          p_parent_code: '2201',
        }),
        admin.rpc('generate_account_child_code', {
          p_workspace_id: workspaceId,
          p_parent_code: '3301',
        }),
      ])

      expect(resA.error).toBeNull()
      expect(resB.error).toBeNull()
      expect(resA.data).toBe('2201-1')
      expect(resB.data).toBe('3301-1')
    },
    30_000
  )

  it('p_workspace_id 為 NULL → raise exception', async () => {
    const { error } = await admin.rpc('generate_account_child_code', {
      p_workspace_id: null as unknown as string,
      p_parent_code: PARENT_CODE,
    })
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/workspace_id is required/i)
  })

  it('p_parent_code 為空 → raise exception', async () => {
    const { error } = await admin.rpc('generate_account_child_code', {
      p_workspace_id: workspaceId,
      p_parent_code: '',
    })
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/parent_code is required/i)
  })
})
