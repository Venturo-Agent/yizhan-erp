-- ============================================
-- 修復 brochure_documents 和 brochure_versions 表的 RLS 問題
-- ============================================
-- 問題：brochure 表格的 RLS 阻止了存檔功能
-- 解決：禁用 RLS（與其他內部 ERP 表格一致）

BEGIN;

-- 禁用 brochure_documents 的 RLS
ALTER TABLE public.brochure_documents DISABLE ROW LEVEL SECURITY;

-- 禁用 brochure_versions 的 RLS
ALTER TABLE public.brochure_versions DISABLE ROW LEVEL SECURITY;

-- 刪除現有的 RLS 策略（如果存在）
DROP POLICY IF EXISTS brochure_documents_select ON public.brochure_documents;
DROP POLICY IF EXISTS brochure_documents_insert ON public.brochure_documents;
DROP POLICY IF EXISTS brochure_documents_update ON public.brochure_documents;
DROP POLICY IF EXISTS brochure_documents_delete ON public.brochure_documents;
DROP POLICY IF EXISTS brochure_documents_policy ON public.brochure_documents;

DROP POLICY IF EXISTS brochure_versions_select ON public.brochure_versions;
DROP POLICY IF EXISTS brochure_versions_insert ON public.brochure_versions;
DROP POLICY IF EXISTS brochure_versions_update ON public.brochure_versions;
DROP POLICY IF EXISTS brochure_versions_delete ON public.brochure_versions;
DROP POLICY IF EXISTS brochure_versions_policy ON public.brochure_versions;

COMMIT;
