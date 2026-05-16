-- ============================================================================
-- P017 修復：系統表 RLS 啟用（_migrations / rate_limits / ref_cities）
-- Date: 2026-04-22 晚間
-- Source: docs/SITEMAP/_PATTERN_MAP.md P017
-- ============================================================================
-- 背景：
--   DB_TRUTH 2026-04-22 16:07 盤點發現 310 張 public 表中、3 張 RLS disabled：
--   1. `_migrations`  — 攻擊者可讀所有 migration SQL、洩漏架構與歷次漏洞修補路徑
--   2. `rate_limits`  — 登入限流表、洩漏會讓攻擊者推測登入模式
--   3. `ref_cities`   — 跟 ref_countries / ref_airports / ref_destinations 同族參考表、
--                        唯獨 ref_cities 沒 enable RLS、該齊一
--
-- 今日修法：
--   _migrations / rate_limits：ENABLE RLS + policy 限 service_role only
--     （app 沒直讀這兩張表、check_rate_limit() 是 SECURITY DEFINER 不受影響）
--   ref_cities：ENABLE RLS + 套 ref_countries 同族 policy
--     （SELECT public read + INSERT/UPDATE/DELETE is_super_admin()）
--
-- 守 CLAUDE.md 紅線：workspaces 絕不 FORCE RLS（本 migration 不碰 workspaces）
-- ============================================================================

BEGIN;

-- === _migrations：系統內部、只給 service_role ===
ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "_migrations_service_role_only" ON public._migrations;
CREATE POLICY "_migrations_service_role_only" ON public._migrations
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- === rate_limits：登入限流表、只給 service_role ===
-- check_rate_limit() function 是 SECURITY DEFINER、繞 RLS 正常運作
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_service_role_only" ON public.rate_limits;
CREATE POLICY "rate_limits_service_role_only" ON public.rate_limits
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- === ref_cities：套 ref_countries 同族模式（公開讀 + super_admin 寫）===
ALTER TABLE public.ref_cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ref_cities_public_read" ON public.ref_cities;
CREATE POLICY "ref_cities_public_read" ON public.ref_cities
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "ref_cities_admin_insert" ON public.ref_cities;
CREATE POLICY "ref_cities_admin_insert" ON public.ref_cities
  FOR INSERT TO public
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "ref_cities_admin_update" ON public.ref_cities;
CREATE POLICY "ref_cities_admin_update" ON public.ref_cities
  FOR UPDATE TO public
  USING (is_super_admin());

DROP POLICY IF EXISTS "ref_cities_admin_delete" ON public.ref_cities;
CREATE POLICY "ref_cities_admin_delete" ON public.ref_cities
  FOR DELETE TO public
  USING (is_super_admin());

-- 驗證
DO $$
DECLARE
  mig_rls boolean;
  rl_rls boolean;
  rc_rls boolean;
BEGIN
  SELECT relrowsecurity INTO mig_rls FROM pg_class WHERE oid = 'public._migrations'::regclass;
  SELECT relrowsecurity INTO rl_rls FROM pg_class WHERE oid = 'public.rate_limits'::regclass;
  SELECT relrowsecurity INTO rc_rls FROM pg_class WHERE oid = 'public.ref_cities'::regclass;

  IF NOT mig_rls THEN RAISE EXCEPTION '_migrations RLS 未啟用'; END IF;
  IF NOT rl_rls THEN RAISE EXCEPTION 'rate_limits RLS 未啟用'; END IF;
  IF NOT rc_rls THEN RAISE EXCEPTION 'ref_cities RLS 未啟用'; END IF;

  -- 守紅線：以上三張都不該 FORCE RLS（他們不在 workspaces 紅線內、但保險起見）
  IF (SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public._migrations'::regclass) THEN
    RAISE EXCEPTION '_migrations 不得 FORCE RLS';
  END IF;
  IF (SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public.rate_limits'::regclass) THEN
    RAISE EXCEPTION 'rate_limits 不得 FORCE RLS（會讓 check_rate_limit SECURITY DEFINER 失效）';
  END IF;

  RAISE NOTICE 'P017 migration 驗證通過：_migrations + rate_limits + ref_cities RLS 全 enabled、無 FORCE RLS';
END $$;

COMMIT;
