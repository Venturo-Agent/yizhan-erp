-- ─────────────────────────────────────────────────────────────────────────────
-- 旅遊團狀態流水線守門 + audit log + 主管強制重開 RPC
--
-- 寫於：2026-05-30
-- 對應：workspace/架構整理/2026-05-30-狀態流水線守門-spec.md
--
-- Why:
--   PR #13 砍 tour.service.ts 時發現原 ALLOWED_STATUS_TRANSITIONS 規則本就沒生效、
--   28 處 caller 全部直連 entity hook 跳過 service。團狀態理論上可以任意亂跳
--   （已結案倒回模板、模板直接跳已結案）、屬於資料完整性洞。
--
--   本 migration 把規則搬到 DB trigger 層、100% 強制（含 PostgREST / RPC / 直連 DB
--   通通擋）、跟資安 #1 一致、跟紅線 E（同表寫入只一處）一致。
--
-- 規則矩陣（William 2026-05-30 拍板）：
--   template  → proposal   (複製模板開始談)
--   proposal  → upcoming   (開團)
--   upcoming  → ongoing    (出發日到、自動)
--   ongoing   → returned   (回程日過、自動)
--   returned  → closed     (結案按鈕)
--   closed    → returned   (僅可透過 reopen_closed_tour RPC、要 tours.reopen_closed)
--   同 → 同：放行（no-op）
--   其他任何跳變：擋下
--
-- 取消團走「封存」維度（archived=true）、跟本流水線正交、不影響 status 欄。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1：tour_status_logs 表（跟 order_status_logs 對稱、加 is_force_reopen / reopen_reason）
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tour_status_logs (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id         text        NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  workspace_id    uuid        NOT NULL,
  from_status     text,
  to_status       text        NOT NULL,
  changed_by      uuid        REFERENCES public.employees(id),
  note            text,
  is_force_reopen boolean     NOT NULL DEFAULT false,
  reopen_reason   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_status_logs_tour
  ON public.tour_status_logs(tour_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tour_status_logs_workspace
  ON public.tour_status_logs(workspace_id);

COMMENT ON TABLE public.tour_status_logs IS
  '旅遊團狀態變動歷史；由 record_tour_status_change trigger 自動寫入；'
  'is_force_reopen=true 代表主管強制重開（必填 reopen_reason）';

-- RLS：同 workspace 可讀、insert 走 trigger SECURITY DEFINER（不開 client policy）
ALTER TABLE public.tour_status_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tsl_select ON public.tour_status_logs;
CREATE POLICY tsl_select ON public.tour_status_logs
  FOR SELECT
  USING (
    workspace_id = (
      SELECT workspace_id FROM public.employees
       WHERE user_id = auth.uid()
       LIMIT 1
    )
  );

-- 故意不開 INSERT/UPDATE/DELETE policy：限制 anon/authenticated 直接寫
-- trigger function 走 SECURITY DEFINER、繞過 RLS 寫入

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2：guard_tour_status_transition（BEFORE UPDATE 守門）
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.guard_tour_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old text;
  v_new text;
BEGIN
  v_old := OLD.status;
  v_new := NEW.status;

  -- 同狀態（no-op）：放行
  IF v_old IS NOT DISTINCT FROM v_new THEN
    RETURN NEW;
  END IF;

  -- 主管強制重開 RPC bypass（session 變數、tx-local）
  IF current_setting('app.bypass_tour_status_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- 合法轉換矩陣（單向流水線）
  IF (v_old, v_new) IN (
    ('template', 'proposal'),
    ('proposal', 'upcoming'),
    ('upcoming', 'ongoing'),
    ('ongoing',  'returned'),
    ('returned', 'closed')
  ) THEN
    RETURN NEW;
  END IF;

  -- 其他全擋（含 closed → returned 沒走 RPC、含任何向後跳）
  RAISE EXCEPTION
    '不允許的旅遊團狀態轉換：% → %（tour_id=%）。若要把「已結案」重開、請走主管「強制重開」按鈕（要 tours.reopen_closed 權限）',
    v_old, v_new, NEW.id
    USING ERRCODE = 'check_violation';
END;
$$;

COMMENT ON FUNCTION public.guard_tour_status_transition() IS
  '旅遊團狀態轉換守門；單向流水線；closed → returned 須走 reopen_closed_tour RPC（set app.bypass_tour_status_guard=true）';

DROP TRIGGER IF EXISTS trg_tours_guard_status_transition ON public.tours;
CREATE TRIGGER trg_tours_guard_status_transition
  BEFORE UPDATE OF status ON public.tours
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.guard_tour_status_transition();

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3：record_tour_status_change（AFTER INSERT/UPDATE 寫 log）
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_tour_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_employee_id   uuid;
  v_is_force      boolean;
  v_reason        text;
BEGIN
  -- 取得當前 employee_id（可能 NULL — 譬如 SECURITY DEFINER context 沒 auth.uid）
  SELECT id INTO v_employee_id
    FROM public.employees
   WHERE user_id = auth.uid()
     AND workspace_id = NEW.workspace_id
   LIMIT 1;

  -- current_setting(name, true) 未設時回 NULL；COALESCE 確保 v_is_force 是真 boolean
  v_is_force := COALESCE(current_setting('app.bypass_tour_status_guard', true) = 'true', false);
  v_reason   := nullif(current_setting('app.tour_reopen_reason', true), '');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.tour_status_logs (
      tour_id, workspace_id, from_status, to_status, changed_by
    ) VALUES (
      NEW.id, NEW.workspace_id, NULL, NEW.status, v_employee_id
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.tour_status_logs (
      tour_id, workspace_id, from_status, to_status, changed_by,
      is_force_reopen, reopen_reason
    ) VALUES (
      NEW.id, NEW.workspace_id, OLD.status, NEW.status, v_employee_id,
      v_is_force, v_reason
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.record_tour_status_change() IS
  '旅遊團狀態變動自動寫 tour_status_logs；讀 session 變數 app.bypass_tour_status_guard / app.tour_reopen_reason 標記強制重開來源';

DROP TRIGGER IF EXISTS trg_tours_record_status_insert ON public.tours;
CREATE TRIGGER trg_tours_record_status_insert
  AFTER INSERT ON public.tours
  FOR EACH ROW
  EXECUTE FUNCTION public.record_tour_status_change();

DROP TRIGGER IF EXISTS trg_tours_record_status_update ON public.tours;
CREATE TRIGGER trg_tours_record_status_update
  AFTER UPDATE OF status ON public.tours
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.record_tour_status_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4：reopen_closed_tour RPC（主管強制重開、唯一合法 closed → returned 通道）
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reopen_closed_tour(
  _tour_id text,
  _reason  text
)
RETURNS public.tours
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tour         public.tours%ROWTYPE;
  v_workspace_id uuid;
BEGIN
  SELECT * INTO v_tour FROM public.tours WHERE id = _tour_id;
  IF v_tour.id IS NULL THEN
    RAISE EXCEPTION '找不到指定旅遊團 (tour_id=%)', _tour_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_workspace_id := v_tour.workspace_id;

  IF v_tour.status <> 'closed' THEN
    RAISE EXCEPTION '此旅遊團目前狀態 % 不是「已結案」、無法重開', v_tour.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT public.has_capability_for_workspace(v_workspace_id, 'tours.reopen_closed') THEN
    RAISE EXCEPTION '權限不足、需要「強制重開已結案旅遊團」權限'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF _reason IS NULL OR length(trim(_reason)) < 1 THEN
    RAISE EXCEPTION '強制重開必須提供原因'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 設 session 變數（tx-local、commit 後自動清）讓 guard 放行 + log 標記強制重開
  PERFORM set_config('app.bypass_tour_status_guard', 'true',  true);
  PERFORM set_config('app.tour_reopen_reason',       _reason, true);

  UPDATE public.tours
     SET status     = 'returned',
         updated_at = now()
   WHERE id = _tour_id
  RETURNING * INTO v_tour;

  RETURN v_tour;
END;
$$;

REVOKE ALL ON FUNCTION public.reopen_closed_tour(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_closed_tour(text, text) TO authenticated;

COMMENT ON FUNCTION public.reopen_closed_tour(text, text) IS
  '主管強制重開已結案旅遊團；要 tours.reopen_closed capability + 原因；繞過 guard + log 標記';

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 5：補種 tours.reopen_closed capability 給「系統主管」（is_admin=true）
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT wr.id, 'tours.reopen_closed', true
  FROM public.workspace_roles wr
 WHERE wr.is_admin = true
   AND NOT EXISTS (
     SELECT 1 FROM public.role_capabilities rc
      WHERE rc.role_id = wr.id
        AND rc.capability_code = 'tours.reopen_closed'
   );

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 6：backfill 現有 tour 初始 log（一次性、之後由 trigger 接手）
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.tour_status_logs (
  tour_id, workspace_id, from_status, to_status, changed_by, note, created_at
)
SELECT
  t.id,
  t.workspace_id,
  NULL,
  t.status,
  NULL,
  '（backfill：trigger 建立前已存在的初始狀態）',
  COALESCE(t.created_at, now())
FROM public.tours t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tour_status_logs l WHERE l.tour_id = t.id
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 7：PostgREST schema reload
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Rollback SQL（緊急用、註解保留）
-- ─────────────────────────────────────────────────────────────────────────────
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.reopen_closed_tour(text, text);
-- DROP TRIGGER  IF EXISTS trg_tours_record_status_update ON public.tours;
-- DROP TRIGGER  IF EXISTS trg_tours_record_status_insert ON public.tours;
-- DROP TRIGGER  IF EXISTS trg_tours_guard_status_transition ON public.tours;
-- DROP FUNCTION IF EXISTS public.record_tour_status_change();
-- DROP FUNCTION IF EXISTS public.guard_tour_status_transition();
-- DELETE FROM public.role_capabilities WHERE capability_code = 'tours.reopen_closed';
-- DROP TABLE IF EXISTS public.tour_status_logs;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
