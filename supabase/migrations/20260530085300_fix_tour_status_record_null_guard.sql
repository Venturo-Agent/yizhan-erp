-- ─────────────────────────────────────────────────────────────────────────────
-- 修：record_tour_status_change 的 v_is_force 在 session 變數未設時是 NULL
-- 結果插入 tour_status_logs.is_force_reopen (NOT NULL) 違反 NOT NULL 約束
--
-- 寫於：2026-05-30
-- 跟前一份 migration（20260530085000_tour_status_pipeline_guard.sql）同 PR
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

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

COMMIT;
