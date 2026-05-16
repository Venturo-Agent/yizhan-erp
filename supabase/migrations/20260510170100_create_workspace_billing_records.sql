-- ============================================================================
-- Migration: 建立 workspace_billing_records 表 + workspaces 訂閱方案欄位
-- Date: 2026-05-10
-- Spec: gap-report § 二、項目 6（租戶費用 / 年約紀錄頁）
--
-- 內容：
--   1. workspaces 加 subscription_plan / subscription_period_end 兩欄
--      （訂閱方案 + 下次到期日、給費用 tab 上方顯示）
--   2. workspace_billing_records 表（歷史付款紀錄）
--   3. RLS：讀自己 workspace 或 workspaces.write、寫只給 workspaces.write
--
-- 紅線遵守：
--   - 純加法（ALTER TABLE ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS）
--   - workspaces 不 FORCE RLS（紅線 A）
--   - billing_records 寫入守 capability 'workspaces.write'（沒「漫途 admin hardcode」）
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. workspaces 加訂閱方案欄位
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
  ADD COLUMN IF NOT EXISTS subscription_period_end DATE;

-- 用 DO block 包 CHECK、避免重跑時撞名
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_subscription_plan_check'
  ) THEN
    ALTER TABLE public.workspaces
      ADD CONSTRAINT workspaces_subscription_plan_check
      CHECK (subscription_plan IS NULL OR subscription_plan IN ('monthly', 'quarterly', 'annual'));
  END IF;
END $$;

COMMENT ON COLUMN public.workspaces.subscription_plan IS
  '訂閱方案：monthly（單月）/ quarterly（季）/ annual（年約）。NULL 表未訂閱';
COMMENT ON COLUMN public.workspaces.subscription_period_end IS
  '當前訂閱週期到期日（下次續費日）';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. workspace_billing_records 表
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspace_billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT workspace_billing_records_period_check CHECK (period_start <= period_end)
);

CREATE INDEX IF NOT EXISTS idx_workspace_billing_records_workspace_period
  ON public.workspace_billing_records(workspace_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_billing_records_status
  ON public.workspace_billing_records(status) WHERE status != 'paid';

COMMENT ON TABLE public.workspace_billing_records IS
  '租戶歷史付款紀錄（每筆代表一次扣款 / 開立的費用單）';
COMMENT ON COLUMN public.workspace_billing_records.amount IS '金額（TWD、含稅）';
COMMENT ON COLUMN public.workspace_billing_records.status IS
  'pending（待繳）/ paid（已繳清）/ overdue（逾期未繳）';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_workspace_billing_records_updated_at ON public.workspace_billing_records;
CREATE TRIGGER set_workspace_billing_records_updated_at
  BEFORE UPDATE ON public.workspace_billing_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS
--   - SELECT：自己 workspace 或有 workspaces.write
--   - 寫入：必須有 workspaces.write
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.workspace_billing_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_billing_records_select ON public.workspace_billing_records;
CREATE POLICY workspace_billing_records_select
  ON public.workspace_billing_records FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()
    )
    OR public.has_capability_for_workspace(workspace_id, 'workspaces.write')
  );

DROP POLICY IF EXISTS workspace_billing_records_write ON public.workspace_billing_records;
CREATE POLICY workspace_billing_records_write
  ON public.workspace_billing_records FOR ALL
  TO authenticated
  USING (
    public.has_capability_for_workspace(workspace_id, 'workspaces.write')
  )
  WITH CHECK (
    public.has_capability_for_workspace(workspace_id, 'workspaces.write')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. NOTIFY pgrst reload schema
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
