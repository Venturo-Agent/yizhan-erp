-- ════════════════════════════════════════════════════════════════════════
-- Auto-enroll：新員工自動加入該 workspace 所有官方頻道
--
-- 5/13 William 問「新同事會自動增加嗎」、答：sidebar 列表自動撈員工 ✓、
-- 但新員工不會自動加入官方頻道（公告 / HAPPY / 系統通知）— 補 trigger。
--
-- 邏輯：
--   employees INSERT、若 status='active' AND employee_type='human'
--   → 把該員工加進該 workspace 所有 is_official=true AND is_archived=false 的 channel
--
-- 不動：
--   - 既有員工已在 Phase 1 enroll 過
--   - 機器人 / integration 員工不自動加（他們不是 chat 對象）
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.auto_enroll_employee_to_official_channels()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 只對 active human 員工自動加
  IF NEW.status = 'active'
     AND COALESCE(NEW.employee_type, 'human') = 'human'
     AND NEW.deleted_at IS NULL
  THEN
    INSERT INTO public.channel_members (channel_id, employee_id, role, joined_at)
    SELECT c.id, NEW.id, 'member', now()
    FROM public.channels c
    WHERE c.workspace_id = NEW.workspace_id
      AND c.is_official = true
      AND c.is_archived = false
      AND NOT EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = c.id AND cm.employee_id = NEW.id
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_enroll_official_channels ON public.employees;
CREATE TRIGGER trg_auto_enroll_official_channels
  AFTER INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_enroll_employee_to_official_channels();

-- 順便：當員工從 inactive → active 也補 enroll（之前 invite 流程留下的 case）
CREATE OR REPLACE FUNCTION public.auto_enroll_on_activate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status != 'active'
     AND NEW.status = 'active'
     AND COALESCE(NEW.employee_type, 'human') = 'human'
     AND NEW.deleted_at IS NULL
  THEN
    INSERT INTO public.channel_members (channel_id, employee_id, role, joined_at)
    SELECT c.id, NEW.id, 'member', now()
    FROM public.channels c
    WHERE c.workspace_id = NEW.workspace_id
      AND c.is_official = true
      AND c.is_archived = false
      AND NOT EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = c.id AND cm.employee_id = NEW.id
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_enroll_on_activate ON public.employees;
CREATE TRIGGER trg_auto_enroll_on_activate
  AFTER UPDATE OF status ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_enroll_on_activate();

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_auto_enroll_on_activate ON public.employees;
-- DROP TRIGGER IF EXISTS trg_auto_enroll_official_channels ON public.employees;
-- DROP FUNCTION IF EXISTS public.auto_enroll_on_activate();
-- DROP FUNCTION IF EXISTS public.auto_enroll_employee_to_official_channels();
-- COMMIT;
