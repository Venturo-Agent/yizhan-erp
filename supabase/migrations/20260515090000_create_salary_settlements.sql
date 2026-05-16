-- ─────────────────────────────────────────────────────────────────────────────
-- 薪資結算系統 — Schema
--
-- 設計來源：[[Logan-Workspace/2026-05-15-bonus-settlement-spec.md]]
-- William 2026-05-15 拍板：薪資結算（先做、按月 batch）+ 獎金結算（之後做、勾選）
--
-- 範圍：
--   - salary_settlements（batch 級、按月聚合）
--   - salary_settlement_items（員工層、每員工一筆）
--
-- 流程：
--   1. HR 主管「新增 X 月薪資」→ 建 settlement (status=draft) + auto-pull 所有 active employees
--   2. detail 頁可看（不能改、要改 reopen tour 或人事資料）
--   3. 「確認」→ transaction：建 payment_request + items + update settlement.status=submitted
--
-- 防撞擊：UNIQUE(workspace_id, period) + SELECT FOR UPDATE WHERE status='draft'
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══ 1. salary_settlements (batch 級) ═══

CREATE TABLE IF NOT EXISTS public.salary_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  -- period 'YYYY-MM' 譬如 '2026-05'、user 看得懂
  period TEXT NOT NULL,
  -- 狀態：draft（建立後可改） / submitted（已產請款、不可改）/ cancelled（廢棄）
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'cancelled')),
  -- 聚合數據（從 items 算、快取在這方便列表顯示）
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  employee_count INTEGER NOT NULL DEFAULT 0,
  -- 「確認」後產出的 payment_request
  payment_request_id UUID REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  -- 備註（譬如「2026 年中獎金」「補發」）
  notes TEXT,
  -- audit
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  -- 同 workspace 同 period 只能一筆
  UNIQUE (workspace_id, period)
);

CREATE INDEX IF NOT EXISTS idx_salary_settlements_workspace_status
  ON public.salary_settlements(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_salary_settlements_payment_request
  ON public.salary_settlements(payment_request_id)
  WHERE payment_request_id IS NOT NULL;

COMMENT ON TABLE public.salary_settlements IS
  '薪資結算 batch（按月聚合、status: draft / submitted / cancelled）';
COMMENT ON COLUMN public.salary_settlements.period IS
  '結算期間、格式 YYYY-MM（譬如 2026-05）';

-- ═══ 2. salary_settlement_items (員工層) ═══

CREATE TABLE IF NOT EXISTS public.salary_settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.salary_settlements(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  -- snapshot 員工資料、防員工改名 / 離職後資料丟失
  employee_name TEXT NOT NULL,
  employee_number TEXT,
  -- 薪資組成
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  attendance_bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  -- 詳細分項（譬如 allowances 的 breakdown、扣款項目）
  breakdown JSONB,
  -- audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 同 settlement 同員工只能一筆
  UNIQUE (settlement_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_salary_settlement_items_settlement
  ON public.salary_settlement_items(settlement_id);
CREATE INDEX IF NOT EXISTS idx_salary_settlement_items_workspace
  ON public.salary_settlement_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_salary_settlement_items_employee
  ON public.salary_settlement_items(employee_id);

COMMENT ON TABLE public.salary_settlement_items IS
  '薪資結算明細（每員工一筆、snapshot 帶員工 name + number 防資料漂移）';

-- ═══ 3. RLS（用 helper procedure、跟其他 workspace-scoped 表一致）═══

CALL public.setup_workspace_scoped_rls('salary_settlements');
CALL public.setup_workspace_scoped_rls('salary_settlement_items');

-- ═══ 4. 完成日誌 ═══

DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✓ 薪資結算 schema 建立完成';
  RAISE NOTICE '  - salary_settlements (batch 級、UNIQUE workspace_id+period)';
  RAISE NOTICE '  - salary_settlement_items (員工層、UNIQUE settlement_id+employee_id)';
  RAISE NOTICE '  - 2 張表 RLS 用 setup_workspace_scoped_rls (8 條 policy)';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

COMMIT;

-- ════════ Rollback（萬一爆炸、複製貼上跑、注意 cascade）════════
-- BEGIN;
-- DROP TABLE IF EXISTS public.salary_settlement_items;
-- DROP TABLE IF EXISTS public.salary_settlements;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
