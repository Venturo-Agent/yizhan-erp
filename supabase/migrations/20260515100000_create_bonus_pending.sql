-- ─────────────────────────────────────────────────────────────────────────────
-- 獎金結算系統 — Schema
--
-- 2026-05-15 William 拍板：tour 結團拿掉「自動產獎金請款」邏輯、改寫進 bonus_pending、
-- HR 介面按團勾選結算、每團一張請款單。
--
-- 範圍：bonus_pending（每員工每團一筆 row）
--
-- 流程：
--   1. tour 結團（既有 ClosingReportDialog 列印 = 確認結團）
--      → tours.status='closed' + 寫進 bonus_pending（status=pending）
--   2. HR /hr/bonus-settlement 列表（按團聚合）
--   3. 勾選團 → 每團產一張 payment_request + items + bonus.status=settled
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS public.bonus_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  -- 注意：tours.id 是 text、不是 uuid（系統 legacy）
  tour_id TEXT NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  -- snapshot 防員工 / 團改名
  employee_name TEXT NOT NULL,
  tour_code TEXT,
  -- 獎金金額 + 原因
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT,
  -- 來源類型（OP / 業務 / 團隊 等、跟原獎金設定對齊）
  bonus_kind TEXT,
  -- 狀態
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'settled', 'cancelled')),
  settled_at TIMESTAMPTZ,
  settled_in_payment_request_id UUID REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  -- audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 同 tour 同員工 同 bonus_kind 只能一筆（避免重複）
  UNIQUE (tour_id, employee_id, bonus_kind)
);

CREATE INDEX IF NOT EXISTS idx_bonus_pending_workspace_status
  ON public.bonus_pending(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_bonus_pending_tour
  ON public.bonus_pending(tour_id);
CREATE INDEX IF NOT EXISTS idx_bonus_pending_settled_in
  ON public.bonus_pending(settled_in_payment_request_id)
  WHERE settled_in_payment_request_id IS NOT NULL;

COMMENT ON TABLE public.bonus_pending IS
  '獎金結算待結算池（每員工每團每 bonus_kind 一筆、status: pending/settled/cancelled）';

-- RLS
CALL public.setup_workspace_scoped_rls('bonus_pending');

DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✓ 獎金結算 schema 建立完成';
  RAISE NOTICE '  - bonus_pending (UNIQUE tour_id+employee_id+bonus_kind)';
  RAISE NOTICE '  - RLS setup_workspace_scoped_rls (4 條 policy)';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

COMMIT;

-- ════════ Rollback ════════
-- BEGIN;
-- DROP TABLE IF EXISTS public.bonus_pending;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
