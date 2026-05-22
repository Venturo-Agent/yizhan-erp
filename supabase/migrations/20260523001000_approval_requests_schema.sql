-- ════════════════════════════════════════════════════════════════
-- 審核請求框架（approval_requests）— 2026-05-23 William 拍板
-- ════════════════════════════════════════════════════════════════
-- 為什麼：
--   1. 過去沒有「員工提交 → HR 審核 → 通過 / 拒絕」的基礎建設
--   2. 第一個用例：員工想改 Email、走審核流程不能隨便改（防接管帳號）
--   3. 未來複用：高金額付款 / 角色升級 / 銀行帳號變更
-- ════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  target_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  requester_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  request_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT approval_status_check CHECK (
    status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')
  )
);

COMMENT ON TABLE public.approval_requests IS
  '通用審核請求框架、員工提交動作 → 有 review capability 的角色批准 / 拒絕。';

CREATE INDEX IF NOT EXISTS idx_approval_requests_workspace
  ON public.approval_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester
  ON public.approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_pending
  ON public.approval_requests(workspace_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_approval_requests_type
  ON public.approval_requests(request_type);

CALL public.setup_workspace_scoped_rls('approval_requests');

CREATE OR REPLACE FUNCTION public.set_approval_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_approval_requests_updated_at ON public.approval_requests;
CREATE TRIGGER trg_approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_approval_requests_updated_at();

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Rollback
-- ════════════════════════════════════════════════════════════════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_approval_requests_updated_at ON public.approval_requests;
-- DROP FUNCTION IF EXISTS public.set_approval_requests_updated_at();
-- DROP TABLE IF EXISTS public.approval_requests;
-- COMMIT;
