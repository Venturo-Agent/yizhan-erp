-- =============================================
-- Migration: order_members 出團鎖加 admin override (follow-up to 20260424080000)
-- Date: 2026-04-24
--
-- 背景：
--   20260424080000 嚴格只允許領隊改、admin 也被擋。
--   William 拍板: admin (擁有平台管理資格的人) 也要能 override。
--   目的: 領隊不在 / 緊急狀況時、admin 還能救援。
--
-- 修法：trigger 內加 OR is_super_admin()
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

  SELECT t.status INTO v_tour_status
  FROM public.tours t
  JOIN public.orders o ON o.tour_id = t.id::text
  WHERE o.id::text = v_target_order_id;

  -- 不在 ongoing 階段、放行
  IF v_tour_status IS DISTINCT FROM 'ongoing' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 擁有平台管理資格的人 (admin) 直接放行 (緊急救援用)
  IF public.is_super_admin() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 一般員工: 只允許領隊
  SELECT wr.name INTO v_caller_role_name
  FROM public.employees e
  JOIN public.workspace_roles wr ON wr.id = e.role_id
  WHERE e.supabase_user_id = auth.uid() OR e.id = auth.uid()
  LIMIT 1;

  IF v_caller_role_name IS DISTINCT FROM '領隊' THEN
    RAISE EXCEPTION '出團當天 (tour status=ongoing) 只有領隊或系統主管能修改團員資料、當前職務: %',
      COALESCE(v_caller_role_name, '無');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

COMMIT;
