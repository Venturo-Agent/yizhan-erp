-- ════════════════════════════════════════════════════════════════════════════
-- LINE 推播用量計次（2026-05-28 William 拍板）
--
-- 為什麼：
--   LINE 免費版每月 200 則「主動推播(push)」額度、超過被擋。系統發 push 傳不出去
--   時錯誤被默默吞掉、也沒地方看用了幾則。建此表:
--     - 以 workspace + 月為單位彙總 push 成功/失敗數（不分哪個同事、一起算）
--     - 記最近一次失敗的錯誤碼（429 額度滿 / 401 token 失效）讓問題現形
--     - 記方案 + 額度上限（免費版預設 200）
--   reply（回覆）無限免費、不計入。
--
-- 計次唯一入口：RPC increment_line_usage（原子 upsert、防併發競態）— 紅線 E。
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

CREATE TABLE IF NOT EXISTS public.workspace_line_usage (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  billing_month       date NOT NULL,                       -- 該月第一天 YYYY-MM-01
  plan                text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  monthly_limit       integer NOT NULL DEFAULT 200,         -- 免費版 200
  push_success_count  integer NOT NULL DEFAULT 0,
  push_fail_count     integer NOT NULL DEFAULT 0,
  last_error_code     text,                                 -- '429' / '401' / 'network' ...
  last_error_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_workspace_line_usage_ws
  ON public.workspace_line_usage (workspace_id, billing_month DESC);

-- RLS：workspace 隔離（業務表必過 workspace_id、紅線 H）。走標準 procedure、不散刻。
CALL public.setup_workspace_scoped_rls('workspace_line_usage');

-- ─── 計次唯一入口：原子 upsert（成功 / 失敗分開累加、防併發）───
CREATE OR REPLACE FUNCTION public.increment_line_usage(
  p_workspace_id uuid,
  p_billing_month date,
  p_success boolean,
  p_error_code text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspace_line_usage (
    workspace_id, billing_month, push_success_count, push_fail_count, last_error_code, last_error_at
  ) VALUES (
    p_workspace_id, p_billing_month,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    CASE WHEN p_success THEN NULL ELSE p_error_code END,
    CASE WHEN p_success THEN NULL ELSE now() END
  )
  ON CONFLICT (workspace_id, billing_month) DO UPDATE SET
    push_success_count = public.workspace_line_usage.push_success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
    push_fail_count    = public.workspace_line_usage.push_fail_count    + CASE WHEN p_success THEN 0 ELSE 1 END,
    last_error_code    = CASE WHEN p_success THEN public.workspace_line_usage.last_error_code ELSE p_error_code END,
    last_error_at      = CASE WHEN p_success THEN public.workspace_line_usage.last_error_at   ELSE now() END,
    updated_at         = now();
END;
$$;

COMMIT;

-- ════ Rollback（萬一要還原、複製貼上跑）════
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.increment_line_usage(uuid, date, boolean, text);
-- DROP TABLE IF EXISTS public.workspace_line_usage;
-- COMMIT;
