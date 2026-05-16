-- =============================================
-- Migration: tour 出團中 (status=ongoing) 鎖 order_members、只允許領隊改 (紅線⑦)
-- Date: 2026-04-24
--
-- 背景：
--   出團當天 (tour.status = 'ongoing') 之前一般員工還能改團員姓名/護照/聯絡人等、
--   data integrity 風險高 (改錯沒人發現、影響保險、出入境)。
--   William 拍板: 出團當天只有領隊 (workspace_roles.name='領隊') 能改。
--
-- 機制：BEFORE UPDATE/DELETE trigger
--   - 找這筆 order_member 對應的 tour status
--   - 不是 'ongoing' → 放行
--   - 是 'ongoing' → 檢查 caller 職務、不是「領隊」就 RAISE EXCEPTION
--
-- ⚠️ 嚴格版：admin (擁有平台管理資格的人) 也會被擋。
--   如果業務上需要 admin emergency override、改 trigger 加 OR is_super_admin()。
--
-- 影響：
--   現況 1 個 ongoing 的 tour、其團員 row 一般員工不能改、要等 status 變回 returned 才能 (或請領隊改)
--
-- Rollback: 見同目錄 .ROLLBACK.sql
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.check_tour_member_modify_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_tour_status text;
  v_caller_role_name text;
  v_target_order_id text;
BEGIN
  v_target_order_id := COALESCE(NEW.order_id, OLD.order_id);

  -- 找對應 tour status
  SELECT t.status INTO v_tour_status
  FROM public.tours t
  JOIN public.orders o ON o.tour_id = t.id::text
  WHERE o.id::text = v_target_order_id;

  -- 不在 ongoing 階段、放行
  IF v_tour_status IS DISTINCT FROM 'ongoing' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 拿當前 caller 的職務名
  SELECT wr.name INTO v_caller_role_name
  FROM public.employees e
  JOIN public.workspace_roles wr ON wr.id = e.role_id
  WHERE e.supabase_user_id = auth.uid() OR e.id = auth.uid()
  LIMIT 1;

  -- 嚴格：只允許領隊
  IF v_caller_role_name IS DISTINCT FROM '領隊' THEN
    RAISE EXCEPTION '出團當天 (tour status=ongoing) 只有領隊能修改團員資料、當前職務: %',
      COALESCE(v_caller_role_name, '無');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS tg_lock_order_members_ongoing ON public.order_members;
CREATE TRIGGER tg_lock_order_members_ongoing
  BEFORE UPDATE OR DELETE ON public.order_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_tour_member_modify_lock();

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM pg_trigger WHERE tgname = 'tg_lock_order_members_ongoing';
  IF c = 0 THEN RAISE EXCEPTION 'trigger 沒建出來'; END IF;
END $$;

COMMIT;
