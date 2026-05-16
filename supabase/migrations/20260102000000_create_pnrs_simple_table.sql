-- ============================================
-- 簡化版 PNR 表格（供前端直接使用）
-- ============================================
-- 日期: 2026-01-02
-- 用途: 提供一個簡單的 denormalized 表格供 TourPnrToolDialog 使用
-- 原因: pnr_records 是 normalized 結構，前端需要簡單的 JSON 欄位

BEGIN;

-- 建立 pnrs 表格
CREATE TABLE IF NOT EXISTS public.pnrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_locator varchar(6) NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  employee_id uuid REFERENCES public.employees(id),
  tour_id text,  -- 關聯的團號

  -- 電報原始內容
  raw_pnr text,

  -- 解析後的欄位（使用 JSONB 儲存陣列）
  passenger_names jsonb DEFAULT '[]'::jsonb,
  segments jsonb DEFAULT '[]'::jsonb,
  special_requests jsonb DEFAULT '[]'::jsonb,
  other_info jsonb DEFAULT '[]'::jsonb,

  -- 日期欄位
  ticketing_deadline timestamptz,
  cancellation_deadline timestamptz,

  -- 狀態
  status varchar(20) DEFAULT 'active',

  -- 備註
  notes text,

  -- 系統欄位
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.employees(id),
  updated_by uuid REFERENCES public.employees(id),

  -- 唯一約束（同 workspace 下不重複）
  UNIQUE(workspace_id, record_locator)
);

-- 註解
COMMENT ON TABLE public.pnrs IS '簡化版 PNR 記錄表（denormalized）';
COMMENT ON COLUMN public.pnrs.record_locator IS 'PNR 代碼（6 碼）';
COMMENT ON COLUMN public.pnrs.passenger_names IS '旅客姓名陣列';
COMMENT ON COLUMN public.pnrs.segments IS '航班段陣列（JSON）';
COMMENT ON COLUMN public.pnrs.special_requests IS 'SSR 陣列（JSON）';
COMMENT ON COLUMN public.pnrs.status IS 'active, ticketed, cancelled, completed';

-- 索引
CREATE INDEX IF NOT EXISTS idx_pnrs_workspace ON public.pnrs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pnrs_record_locator ON public.pnrs(record_locator);
CREATE INDEX IF NOT EXISTS idx_pnrs_tour_id ON public.pnrs(tour_id) WHERE tour_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pnrs_ticketing_deadline ON public.pnrs(ticketing_deadline) WHERE ticketing_deadline IS NOT NULL;

-- RLS
ALTER TABLE public.pnrs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pnrs_select" ON public.pnrs;
CREATE POLICY "pnrs_select" ON public.pnrs FOR SELECT
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "pnrs_insert" ON public.pnrs;
CREATE POLICY "pnrs_insert" ON public.pnrs FOR INSERT
WITH CHECK (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "pnrs_update" ON public.pnrs;
CREATE POLICY "pnrs_update" ON public.pnrs FOR UPDATE
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

DROP POLICY IF EXISTS "pnrs_delete" ON public.pnrs;
CREATE POLICY "pnrs_delete" ON public.pnrs FOR DELETE
USING (
  workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION update_pnrs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pnrs_updated_at ON public.pnrs;
DROP TRIGGER IF EXISTS pnrs_updated_at ON public.pnrs;
CREATE TRIGGER pnrs_updated_at
  BEFORE UPDATE ON public.pnrs
  FOR EACH ROW
  EXECUTE FUNCTION update_pnrs_updated_at();

COMMIT;

-- 驗證
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ pnrs 簡化表格建立完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '欄位:';
  RAISE NOTICE '  • record_locator - PNR 代碼';
  RAISE NOTICE '  • passenger_names - 旅客姓名 (JSONB)';
  RAISE NOTICE '  • segments - 航班段 (JSONB)';
  RAISE NOTICE '  • special_requests - SSR (JSONB)';
  RAISE NOTICE '  • ticketing_deadline - 出票期限';
  RAISE NOTICE '========================================';
END $$;
