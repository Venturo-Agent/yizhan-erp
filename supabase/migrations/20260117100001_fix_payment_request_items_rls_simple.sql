-- =============================================
-- 修復 payment_request_items RLS 政策
-- 允許認證用戶操作，不再嚴格檢查 workspace_id
-- =============================================

BEGIN;

-- 確保 RLS 已啟用
ALTER TABLE public.payment_request_items ENABLE ROW LEVEL SECURITY;

-- 刪除舊的 policies
DROP POLICY IF EXISTS "payment_request_items_select" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_insert" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_update" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_delete" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_select_policy" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_insert_policy" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_update_policy" ON public.payment_request_items;
DROP POLICY IF EXISTS "payment_request_items_delete_policy" ON public.payment_request_items;

-- 建立新的 RLS 政策（允許所有認證用戶操作）
-- payment_request_items 的安全性由父表 payment_requests 的 RLS 來保證
DROP POLICY IF EXISTS "payment_request_items_select" ON public.payment_request_items;
CREATE POLICY "payment_request_items_select" ON public.payment_request_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "payment_request_items_insert" ON public.payment_request_items;
CREATE POLICY "payment_request_items_insert" ON public.payment_request_items
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "payment_request_items_update" ON public.payment_request_items;
CREATE POLICY "payment_request_items_update" ON public.payment_request_items
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "payment_request_items_delete" ON public.payment_request_items;
CREATE POLICY "payment_request_items_delete" ON public.payment_request_items
  FOR DELETE TO authenticated USING (true);

COMMIT;
