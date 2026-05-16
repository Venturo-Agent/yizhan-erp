-- 修復 vendor_costs 表的 RLS 政策
-- 這是公司共用資料，所有登入用戶都可以讀寫

-- 先檢查並刪除舊的 policies
DROP POLICY IF EXISTS "vendor_costs_select" ON public.vendor_costs;
DROP POLICY IF EXISTS "vendor_costs_insert" ON public.vendor_costs;
DROP POLICY IF EXISTS "vendor_costs_update" ON public.vendor_costs;
DROP POLICY IF EXISTS "vendor_costs_delete" ON public.vendor_costs;

-- 確保 RLS 已啟用
ALTER TABLE public.vendor_costs ENABLE ROW LEVEL SECURITY;

-- 建立新的 policies - 允許所有已認證用戶讀寫
DROP POLICY IF EXISTS "vendor_costs_select" ON public.vendor_costs;
CREATE POLICY "vendor_costs_select" ON public.vendor_costs
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "vendor_costs_insert" ON public.vendor_costs;
CREATE POLICY "vendor_costs_insert" ON public.vendor_costs
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "vendor_costs_update" ON public.vendor_costs;
CREATE POLICY "vendor_costs_update" ON public.vendor_costs
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "vendor_costs_delete" ON public.vendor_costs;
CREATE POLICY "vendor_costs_delete" ON public.vendor_costs
  FOR DELETE TO authenticated
  USING (true);
