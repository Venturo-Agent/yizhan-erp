-- ============================================
-- 修復 5 張 CRITICAL 表的 RLS 政策
-- ============================================
-- 日期: 2026-04-05
-- 目的: 為缺少 RLS 的關鍵業務表啟用 RLS + workspace 隔離
-- 涵蓋表格:
--   1. accounting_subjects — 會計科目（有 workspace_id）
--   2. company_assets — 公司資產（有 workspace_id）
--   3. confirmations — 確認單（有 workspace_id）
--   4. tour_confirmation_sheets — 出團確認表（有 workspace_id）
--   5. tour_confirmation_items — 出團確認明細（有 workspace_id）
--   6. esims — eSIM 卡（有 workspace_id）
--   7. visas — 簽證（有 workspace_id）
-- ============================================


-- ============================================
-- 1. accounting_subjects（會計科目）
-- 注意：部分科目 workspace_id 為 NULL（系統預設科目），
--       需要允許 NULL workspace_id 的記錄被所有人讀取
-- ============================================

ALTER TABLE public.accounting_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_subjects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_subjects_select" ON public.accounting_subjects;
DROP POLICY IF EXISTS "accounting_subjects_insert" ON public.accounting_subjects;
DROP POLICY IF EXISTS "accounting_subjects_update" ON public.accounting_subjects;
DROP POLICY IF EXISTS "accounting_subjects_delete" ON public.accounting_subjects;

-- SELECT: 系統科目（workspace_id IS NULL）所有人可讀 + 自己 workspace 的 + super_admin
CREATE POLICY "accounting_subjects_select" ON public.accounting_subjects
FOR SELECT USING (
  workspace_id IS NULL
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- INSERT: 只能新增到自己的 workspace
CREATE POLICY "accounting_subjects_insert" ON public.accounting_subjects
FOR INSERT WITH CHECK (
  workspace_id = get_current_user_workspace()
);

-- UPDATE: 只能改自己 workspace 的（系統科目不應被修改） + super_admin
CREATE POLICY "accounting_subjects_update" ON public.accounting_subjects
FOR UPDATE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- DELETE: 只能刪自己 workspace 的 + super_admin
CREATE POLICY "accounting_subjects_delete" ON public.accounting_subjects
FOR DELETE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- ============================================
-- 2. company_assets（公司資產）
-- workspace_id 在 20260203090000 migration 中已加入
-- ============================================

ALTER TABLE public.company_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_assets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_assets_select" ON public.company_assets;
DROP POLICY IF EXISTS "company_assets_insert" ON public.company_assets;
DROP POLICY IF EXISTS "company_assets_update" ON public.company_assets;
DROP POLICY IF EXISTS "company_assets_delete" ON public.company_assets;
-- 清除可能存在的舊式 policy
DROP POLICY IF EXISTS "company_assets_workspace_access" ON public.company_assets;

CREATE POLICY "company_assets_select" ON public.company_assets
FOR SELECT USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

CREATE POLICY "company_assets_insert" ON public.company_assets
FOR INSERT WITH CHECK (
  workspace_id = get_current_user_workspace()
);

CREATE POLICY "company_assets_update" ON public.company_assets
FOR UPDATE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

CREATE POLICY "company_assets_delete" ON public.company_assets
FOR DELETE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- ============================================
-- 3. confirmations（確認單，舊表）
-- 在 20260102140000 中被 DISABLE，現在重新啟用
-- 此表有 workspace_id 欄位
-- ============================================

ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "confirmations_select" ON public.confirmations;
DROP POLICY IF EXISTS "confirmations_insert" ON public.confirmations;
DROP POLICY IF EXISTS "confirmations_update" ON public.confirmations;
DROP POLICY IF EXISTS "confirmations_delete" ON public.confirmations;

CREATE POLICY "confirmations_select" ON public.confirmations
FOR SELECT USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

CREATE POLICY "confirmations_insert" ON public.confirmations
FOR INSERT WITH CHECK (
  workspace_id = get_current_user_workspace()
);

CREATE POLICY "confirmations_update" ON public.confirmations
FOR UPDATE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

CREATE POLICY "confirmations_delete" ON public.confirmations
FOR DELETE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- ============================================
-- 3b. tour_confirmation_sheets（出團確認表）
-- 有 workspace_id，但目前無 RLS
-- ============================================

ALTER TABLE public.tour_confirmation_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_confirmation_sheets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_confirmation_sheets_select" ON public.tour_confirmation_sheets;
DROP POLICY IF EXISTS "tour_confirmation_sheets_insert" ON public.tour_confirmation_sheets;
DROP POLICY IF EXISTS "tour_confirmation_sheets_update" ON public.tour_confirmation_sheets;
DROP POLICY IF EXISTS "tour_confirmation_sheets_delete" ON public.tour_confirmation_sheets;

CREATE POLICY "tour_confirmation_sheets_select" ON public.tour_confirmation_sheets
FOR SELECT USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

CREATE POLICY "tour_confirmation_sheets_insert" ON public.tour_confirmation_sheets
FOR INSERT WITH CHECK (
  workspace_id = get_current_user_workspace()
);

CREATE POLICY "tour_confirmation_sheets_update" ON public.tour_confirmation_sheets
FOR UPDATE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

CREATE POLICY "tour_confirmation_sheets_delete" ON public.tour_confirmation_sheets
FOR DELETE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- ============================================
-- 3c. tour_confirmation_items（出團確認明細）
-- 有 workspace_id，但目前無 RLS
-- ============================================

ALTER TABLE public.tour_confirmation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_confirmation_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_confirmation_items_select" ON public.tour_confirmation_items;
DROP POLICY IF EXISTS "tour_confirmation_items_insert" ON public.tour_confirmation_items;
DROP POLICY IF EXISTS "tour_confirmation_items_update" ON public.tour_confirmation_items;
DROP POLICY IF EXISTS "tour_confirmation_items_delete" ON public.tour_confirmation_items;

CREATE POLICY "tour_confirmation_items_select" ON public.tour_confirmation_items
FOR SELECT USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

CREATE POLICY "tour_confirmation_items_insert" ON public.tour_confirmation_items
FOR INSERT WITH CHECK (
  workspace_id = get_current_user_workspace()
);

CREATE POLICY "tour_confirmation_items_update" ON public.tour_confirmation_items
FOR UPDATE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

CREATE POLICY "tour_confirmation_items_delete" ON public.tour_confirmation_items
FOR DELETE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- ============================================
-- 4. esims（eSIM 卡）
-- 有 workspace_id（已在 20260225 migration 確認）
-- ============================================

ALTER TABLE public.esims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esims FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esims_select" ON public.esims;
DROP POLICY IF EXISTS "esims_insert" ON public.esims;
DROP POLICY IF EXISTS "esims_update" ON public.esims;
DROP POLICY IF EXISTS "esims_delete" ON public.esims;

CREATE POLICY "esims_select" ON public.esims
FOR SELECT USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

CREATE POLICY "esims_insert" ON public.esims
FOR INSERT WITH CHECK (
  workspace_id = get_current_user_workspace()
);

CREATE POLICY "esims_update" ON public.esims
FOR UPDATE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

CREATE POLICY "esims_delete" ON public.esims
FOR DELETE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- ============================================
-- 5. visas（簽證）
-- 有 workspace_id（在 CREATE TABLE 中確認）
-- ============================================

ALTER TABLE public.visas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visas_select" ON public.visas;
DROP POLICY IF EXISTS "visas_insert" ON public.visas;
DROP POLICY IF EXISTS "visas_update" ON public.visas;
DROP POLICY IF EXISTS "visas_delete" ON public.visas;

CREATE POLICY "visas_select" ON public.visas
FOR SELECT USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

CREATE POLICY "visas_insert" ON public.visas
FOR INSERT WITH CHECK (
  workspace_id = get_current_user_workspace()
);

CREATE POLICY "visas_update" ON public.visas
FOR UPDATE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

CREATE POLICY "visas_delete" ON public.visas
FOR DELETE USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);


-- ============================================
-- 驗證：確認所有表的 RLS 狀態
-- ============================================

DO $$
DECLARE
  target_tables text[] := ARRAY[
    'accounting_subjects', 'company_assets', 'confirmations',
    'tour_confirmation_sheets', 'tour_confirmation_items',
    'esims', 'visas'
  ];
  tbl text;
  rls_on boolean;
  policy_cnt integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRITICAL 表 RLS 修復驗證結果';
  RAISE NOTICE '========================================';

  FOREACH tbl IN ARRAY target_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      SELECT c.relrowsecurity INTO rls_on
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tbl;

      SELECT COUNT(*) INTO policy_cnt
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl;

      RAISE NOTICE '  % — RLS: %, policies: %', tbl, rls_on, policy_cnt;
    ELSE
      RAISE NOTICE '  % — 表不存在（已跳過）', tbl;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
END $$;
