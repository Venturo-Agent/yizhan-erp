import { test, expect } from '@playwright/test'

/**
 * Cross-workspace 資安測試
 *
 * 目的：驗證多租戶隔離雙重 enforcement（ADR-0001 / docs/SECURITY.md）
 *   - RLS（DB 層）
 *   - enforceWorkspaceScope（應用層）
 * 兩者缺一不可、漏一個就客戶資料外洩。
 *
 * 狀態：**skip**（待搬完伺服器、有 fixture workspace + admin token 才能跑）
 *
 * D+1 要做的：
 *   1. 在 fixtures/ 建兩個 workspace（A、B）+ 各自的測試員工
 *   2. 把下面每個 it.skip 改 it、實作測試
 *   3. 整套接 CI、每次 PR 都跑
 */

const ENTITIES_TO_TEST = [
  'orders',
  'payments',
  'payment_requests',
  'disbursement_orders',
  'receipts',
  'customers',
  'tours',
  'quotes',
  'attractions',
  'restaurants',
  'hotels',
  'suppliers',
  'employees',
  'role_capabilities',
  'company_settings',
] as const

test.describe.skip('Cross-workspace security（多租戶隔離雙重 enforcement）', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 基本攻擊：A 看 B 的資料
  // ─────────────────────────────────────────────────────────────────────────

  test.describe('Workspace A 訪問 Workspace B 資料', () => {
    for (const entity of ENTITIES_TO_TEST) {
      test(`GET /${entity}/{B-id} as A user → 403 或空`, async ({ page }) => {
        // TODO 實作：
        // 1. 用 fixtures.loginAs('A')
        // 2. 抓 B workspace 一筆 entity 的 id（用 admin token 預先建）
        // 3. fetch(`/api/${entity}/${id}`) as A
        // 4. expect status 403 OR data null/empty
      })

      test(`LIST /${entity} as A user → 看不到 B 的資料`, async ({ page }) => {
        // TODO:
        // 1. B workspace 有 N 筆
        // 2. A user list → 應該 0 筆 OR 只看 A 的
      })

      test(`UPDATE /${entity}/{B-id} as A user → 403 或無變更`, async ({ page }) => {
        // TODO:
        // 1. 嘗試 update B 的 entity
        // 2. expect 失敗、或 update count = 0
      })

      test(`DELETE /${entity}/{B-id} as A user → 403`, async ({ page }) => {
        // TODO:
        // 1. 嘗試 delete B 的 entity
        // 2. expect 失敗
      })
    }
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Admin opt-out：明確帶 allowCrossWorkspace
  // ─────────────────────────────────────────────────────────────────────────

  test.describe('Admin cross-workspace opt-out', () => {
    test('Admin token + allowCrossWorkspace=true → 過', async () => {
      // TODO:
      // 1. 用 admin token（具備 admin.cross_workspace.read capability）
      // 2. fetch admin endpoint that uses allowCrossWorkspace
      // 3. expect 200 + 看到所有 workspace 的資料
    })

    test('一般 user + allowCrossWorkspace=true → 必擋', async () => {
      // TODO:
      // 1. 一般員工 token（沒 admin.cross_workspace 權限）
      // 2. 嘗試 hit admin endpoint
      // 3. expect 403
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // RLS 直連測試（繞過應用層）
  // ─────────────────────────────────────────────────────────────────────────

  test.describe('RLS 直連（繞過應用層 helper、純驗 RLS）', () => {
    test('用 A 的 anon key 直接 supabase.from(orders) → 只看到 A 的', async () => {
      // TODO:
      // 1. 直接 createClient(supabaseUrl, A_anon_key)
      // 2. 不走應用層、直接 .from('orders').select('*')
      // 3. expect 只看到 A 的、看不到 B 的
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 軟刪除 + audit 跨 workspace 測試
  // ─────────────────────────────────────────────────────────────────────────

  test.describe('軟刪除 + audit 跨 workspace', () => {
    test('A 軟刪除 A 的 order → audit_logs 記錄屬於 A、B 看不到', async () => {
      // TODO:
      // 1. A 的 user 軟刪除 A 的 order
      // 2. 查 audit_logs as A → 看到記錄
      // 3. 查 audit_logs as B → 看不到（RLS 擋）
    })

    test('A 不能軟刪除 B 的 order', async () => {
      // TODO:
      // 1. A 的 user 嘗試 softDelete B 的 order
      // 2. expect 失敗（RLS + enforceWorkspaceScope 雙重擋）
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Realtime 跨 workspace（拆遷後驗）
  // ─────────────────────────────────────────────────────────────────────────

  test.describe('Realtime channel workspace filter（#14 拆遷完才能 enable）', () => {
    test('A subscribe orders → B 的更新不該收到', async () => {
      // TODO（要 #14 拆遷完）:
      // 1. A user subscribe channel('realtime:orders:A-workspace-id')
      // 2. B user 更新 B 的 order
      // 3. A 不該收到 broadcast event
    })
  })
})
