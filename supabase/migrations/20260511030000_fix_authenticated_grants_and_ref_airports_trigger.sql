-- ─────────────────────────────────────────────────────────────────────────────
-- 上線前 Tier 1 修：補 authenticated 寫權限 + 砍 ref_airports 錯誤 trigger
--
-- 發現於 2026-05-11 凌晨：Playwright CRUD spec 跑全炸、root cause：
--   1. authenticated role 缺 GRANT INSERT/UPDATE/DELETE on public schema
--      → 所有 UI 寫入 403 "permission denied for table xxx" (PG 42501)
--      → 唯一有寫入 GRANT 的是 storage 4 表（buckets / objects 等）、業務表全沒
--      → ERP 沒任何 user 能寫資料（service_role 例外、bypass RLS + grants）
--   2. trigger_auto_set_workspace_id on ref_airports：ref 表沒 workspace_id 欄位、
--      trigger 卻 access NEW.workspace_id、INSERT 全 throw
--      → /api/airports POST 500、新增機場走不通
--
-- 紅線檢核：
--   - 不動 RLS policy（policy 還是守、grants 只是 DB-level 第一層）
--   - 不違反「沒有超級管理員」（authenticated 是 Supabase 內建 role、不是 admin bypass）
--   - 修完仍走 RLS：grants 允許 SQL 嘗試寫、RLS policy 決定真的能不能寫
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. 補 authenticated role 寫權限
-- Supabase 預設 authenticated 只有 SELECT、INSERT/UPDATE/DELETE 缺、依賴 RLS 守
-- 但少了 GRANT、RLS policy 跑不到、PG 在更早的 permission check 就 deny
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 未來新建的表 / sequences 也要繼承這個 grant
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO authenticated;

-- 2. 砍 ref_airports 上設計錯誤的 trigger
-- trigger_auto_set_workspace_id 預期表有 workspace_id 欄位、但 ref_airports 沒、會 throw
-- ref_* 是 system-level 共用資料表（航空公司 / 機場 / 國家等）、不該綁 workspace
DROP TRIGGER IF EXISTS trigger_auto_set_workspace_id ON public.ref_airports;

NOTIFY pgrst, 'reload schema';

COMMIT;
