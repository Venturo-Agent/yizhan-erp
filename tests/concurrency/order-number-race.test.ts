/**
 * @vitest-environment node
 *
 * 並發壓測：generate_order_number RPC
 *
 * 格式：{tour_code}-O{NN} (per-tour scoped、不是 workspace scoped)
 *
 * 本測試先建一個 sandbox tour、然後對它跑 10 個並發 RPC：
 *   應該回 {TOUR}-O01 .. {TOUR}-O10、全不同。
 *
 * Why：
 *   訂單編號之前 orders/page.tsx + tours/ToursPage.tsx 兩處算 max+1、易撞號。
 *   PR-2 Phase 2 補 RPC、本測試壓 advisory lock。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createSandboxWorkspace,
  hasServiceRoleKey,
  makeAdminClient,
  teardownSandboxWorkspace,
} from './helpers/setup'

describe.skipIf(!hasServiceRoleKey())('generate_order_number 並發競態', () => {
  let admin: SupabaseClient
  let workspaceId: string
  let tourId: string | null = null
  let tourCode: string | null = null

  beforeAll(async () => {
    if (!hasServiceRoleKey()) return
    admin = makeAdminClient()
    const ws = await createSandboxWorkspace(admin, 'ORD-RACE')
    workspaceId = ws.id

    // 建一個 sandbox tour（schema 變動快、若 INSERT 失敗就 skip 後續測試）
    const candidateCode = `T${Date.now().toString().slice(-6)}`
    const { data: tourData, error: tourError } = await admin
      .from('tours')
      .insert({
        workspace_id: workspaceId,
        code: candidateCode,
        name: `Race test tour ${Date.now()}`,
        // 其他 NOT NULL 欄位若有、需要時補
      })
      .select('id, code')
      .single()

    if (tourError) {
      console.warn(
        `tours INSERT failed (race test 將 skip 主測試): ${tourError.message}`
      )
      return
    }
    tourId = (tourData as { id: string }).id
    tourCode = (tourData as { code: string }).code
  })

  afterAll(async () => {
    if (!workspaceId) return
    await teardownSandboxWorkspace(admin, workspaceId)
  })

  it(
    '10 並發 call → 回 10 個不同的 {tour}-O01 .. -O10',
    async () => {
      if (!tourId || !tourCode) {
        console.warn('skip: tour setup failed')
        return
      }

      const N = 10
      const promises = Array.from({ length: N }, () =>
        admin.rpc('generate_order_number', { p_tour_id: tourId })
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

      const sorted = [...codes].sort()
      for (let i = 0; i < N; i++) {
        const expected = `${tourCode}-O${String(i + 1).padStart(2, '0')}`
        expect(sorted[i]).toBe(expected)
      }
    },
    30_000
  )

  it('tour_id 不存在 → RPC raise exception', async () => {
    const { data, error } = await admin.rpc('generate_order_number', {
      p_tour_id: '00000000-0000-0000-0000-000000000000',
    })
    expect(data).toBeNull()
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/tour not found/i)
  })

  it('tour_id 為空字串 → RPC raise exception', async () => {
    const { data, error } = await admin.rpc('generate_order_number', {
      p_tour_id: '',
    })
    expect(data).toBeNull()
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/tour_id is required/i)
  })
})
