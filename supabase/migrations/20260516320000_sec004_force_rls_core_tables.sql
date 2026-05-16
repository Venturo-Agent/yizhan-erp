-- SEC-004: 對核心業務表啟用 FORCE ROW LEVEL SECURITY
--
-- Why: 即使是 superuser / service_role 也受 RLS 約束，防止應用層
-- 因 bug 意外繞過 workspace 隔離，造成跨租戶資料洩漏。
--
-- ⚠️ 紅線：workspaces 表絕對不能 FORCE RLS（會打斷登入流程）
-- 本 migration 只動業務表，不動 workspaces。
--
-- Rollback:
--   ALTER TABLE public.orders NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.tours NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.customers NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.contracts NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.employees NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.receipts NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.payment_requests NO FORCE ROW LEVEL SECURITY;

BEGIN;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'orders',
    'tours',
    'customers',
    'contracts',
    'employees',
    'receipts',
    'payment_requests'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
      RAISE NOTICE 'FORCE RLS applied: %', t;
    ELSE
      RAISE NOTICE 'Table not found, skipped: %', t;
    END IF;
  END LOOP;
END $$;

-- 驗證：確認 workspaces 沒有被 FORCE（紅線保護）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'workspaces'
      AND relforcerowsecurity = true
  ) THEN
    RAISE EXCEPTION '紅線違反：workspaces 表不能 FORCE RLS';
  END IF;
  RAISE NOTICE 'OK: workspaces 無 FORCE RLS';
END $$;

COMMIT;
