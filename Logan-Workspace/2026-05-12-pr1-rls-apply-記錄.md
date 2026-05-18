---
date: 2026-05-12
author: Logan
status: 完成
related: yizhan-erp / PR-1
---

# PR-1 RLS 補洞 — 執行紀錄 + 意外發現

## TL;DR

- 原以為要修 5 張表、實際只有 1 張要修
- production state 跟 migration files 不同步、害我們前面 audit 判斷錯（之後要解 SSOT）
- contracts 1 張表 RLS policy 收緊完成、apply 成功、紅線 A 守住、登入流程沒炸
- 漫途客戶 / 供應商 / 合約資料完整、跨租戶隔離正常

## 預期 vs 實際（學到的教訓）

### 預期（基於 Pattern C 跨全站 audit）

5 張表需要 ENABLE RLS：
- customers / suppliers / payments / contracts / travel_invoices

依據：`20251211000000_disable_all_remaining_rls.sql` 把這幾張 DISABLE、Phase A2/A3 沒拉回來

### 實際（pre-check production 後）

| 表 | 預期狀態 | 真實狀態 |
|---|---|---|
| customers | DISABLED 要修 | ✅ 已 ENABLED + 4 條正確 policy |
| suppliers | DISABLED 要修 | ✅ 已 ENABLED + 4 條正確 policy |
| contracts | DISABLED 要修 | ⚠️ 已 ENABLED 但 policy 有兩個洞 |
| payments | DISABLED 要修 | ❌ 表不存在 |
| travel_invoices | DISABLED 要修 | ❌ 表不存在（之前 drop_travel_invoices_ghost_house migration 砍） |

→ PR-1 真正 scope 從 5 張縮到 1 張

### 學到的教訓

**🚨 SSOT 重大問題：migration files ≠ production state**

customers / suppliers / contracts 的 RLS ENABLED 沒有對應 migration 檔。應該是有人手動在 Supabase Dashboard 改的、沒留 migration。

這意味著未來任何 audit 都不能只看 migration files 推測、必須直接 query production。

**對應行動（未來 PR）**：
1. 寫一個「capture-current-state」migration 把 production 真實的 policy 都灌進版本控制
2. 跟 William 約定：之後任何 DB 改動只走 migration、不在 Dashboard 手改
3. 寫個 CI script 偵測 production state 跟 migration files 不同步

## contracts 修了什麼

### 修前（兩個洞）

```sql
-- SELECT / UPDATE / DELETE：有 NULL workspace bypass
USING ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()))
-- → 任何 workspace_id IS NULL 的 contract、所有 user 都看得到

-- INSERT：完全沒守門
WITH CHECK (true)
-- → 任何認證 user 可以 insert 到任何 workspace
```

### 修後

```sql
-- SELECT / DELETE
USING (workspace_id = get_current_user_workspace())

-- INSERT / UPDATE
WITH CHECK (workspace_id = get_current_user_workspace())
```

### 風險評估（修前 pre-check）

- contracts 表：10 row、0 NULL workspace、全部在漫途 workspace `a89335d4`
- → 移除 NULL bypass 不影響任何現存 row
- → 收緊 INSERT 不影響現存 row（只擋未來不當寫入）
- LOW risk

## Apply 過程

1. ✅ pre-check：確認 0 NULL workspace_id、確認 contracts 表存在
2. ✅ apply 透過 SSH Vultr + psql 直連 aawrgygqgemgqssflfrx
3. ✅ 內含 `BEGIN ... COMMIT` atomic transaction
4. ✅ 內含完工驗證（policy count = 4 + 無 NULL bypass + 無 loose INSERT）

## Smoke test 驗證

| 測試 | 結果 |
|---|---|
| 漫途員工身分 query contracts | ✅ 看到 10 row |
| 假 user_id query contracts | ✅ 看到 0 row（RLS 正確擋住） |
| anon key 透過 HTTP /rest/v1/contracts | ✅ `[]` 回傳（RLS 擋住） |
| workspaces 表能看到（紅線 A 關鍵） | ✅ 看到 1 個 workspace（登入流程正常） |

## 副作用 + 後續

### 1. ⚠️ Supabase CLI link 到錯的專案

`supabase/.temp/project-ref` = `wzvwmawpkapcmkfmkvav`（舊 Venturo-Erp）
應該是 `aawrgygqgemgqssflfrx`（yizhan-erp）

→ **絕對不要跑 `supabase db push`**、會把 migration 推到舊 erp
→ 修法：`supabase link --project-ref aawrgygqgemgqssflfrx`（要 agency@ PAT、之後另開 PR 修）

### 2. migrations-pending/ vs migrations/

我把 006 從 pending 移到正式 migrations、改名為 `20260512153000_phase_a4_contracts_rls_tightening.sql`。
之後 CLI 修好後、`supabase db push` 會 idempotent 跳過這份（因為 production 已有對應 RLS）。

### 3. 之前的 audit 報告要修

`2026-05-12-bug-audit-全站-pattern-matrix.md` 裡寫的「5 張表 RLS DISABLED」是錯的。
→ 之後再更新該報告、或寫個 addendum 卡

## 檔案位置

- Migration（已 apply）：`yizhan-erp/supabase/migrations/20260512153000_phase_a4_contracts_rls_tightening.sql`
- 原 pending 草稿：已移走、不留 ghost 檔
