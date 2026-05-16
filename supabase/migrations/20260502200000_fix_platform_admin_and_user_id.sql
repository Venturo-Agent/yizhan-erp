-- =============================================
-- Migration: 修 is_super_admin() stub + 同步 employees.user_id（E1）
-- 2026-05-02
--
-- 背景：
--   D1 RLS audit 揭示兩個根本性失效：
--   (1) public.is_super_admin() 已被改成 stub `RETURN false`、
--       全站 69 條 RLS policy 引用作 platform admin 繞過、實際全部失效
--       → 平台管理員一般登入會被自己的 RLS 鎖死（必走 service-role API）
--   (2) employees 同時有 user_id 跟 supabase_user_id 兩個欄位、
--       現存 16 員工只有 3 筆 user_id 不為 null、其餘 13 筆全靠 supabase_user_id
--       → has_capability_for_workspace 用 e.user_id = auth.uid() 對 13/16 員工永遠 false
--
-- 本 migration 執行：
--   A. 用實際邏輯重建 is_super_admin()
--      - 判斷「當前 auth user 是任一 active workspace_role(is_admin=true) 的成員」
--      - SECURITY DEFINER + STABLE、跟 has_capability_for_workspace 一致
--      - 不加離職 bypass：employees.status = 'active' 才算
--      - 不混 platform_admin 概念（純 workspace admin、跨租戶靠 service-role API）
--   B. 同步 employees.user_id：把 supabase_user_id 不為 null 的 13 筆 user_id 補齊
--      （兩欄位歷史並存、本次以 user_id 為新真相、暫不 DROP supabase_user_id 以免炸 66 處引用）
--   C. 加 trigger sync_employee_user_id：未來 INSERT/UPDATE 時自動把 supabase_user_id 反向回填到 user_id
--
-- 不動：
--   - 任何 RLS policy（其他 E* agent 的範圍）
--   - employees.supabase_user_id 欄位（66 處 codebase 引用、E3 agent 後續處理）
--   - workspaces 表（憲法紅線：不准 FORCE RLS）
--   - auth.* / storage.* schema
--
-- 驗證：
--   - is_super_admin() 在 service_role（auth.uid() = null）回 false（合理）
--   - corner_e001 / e002 / e004 預期 is_admin = true 之 role
--   - 修前：with_user_id = 3 / 16；修後：with_user_id = 13 / 16（剩 3 筆是無 auth.users 對應的 bot/孤兒）
-- =============================================

BEGIN;

-- ============================================================
-- A. 重建 is_super_admin()
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.workspace_roles wr ON wr.id = e.role_id
    WHERE e.user_id = auth.uid()
      AND wr.is_admin = true
      AND e.status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  '當前 auth user 是否為任一 workspace 的 admin role（workspace_roles.is_admin=true）。'
  ' 實作上等同「workspace admin」、ERP 不區分純 platform_admin 概念。'
  ' 2026-05-02: D1 audit 揭示舊版被改成 stub RETURN false、本次改回真實邏輯（E1）。';

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ============================================================
-- B. 同步 employees.user_id
-- ============================================================

-- 把 supabase_user_id 有值但 user_id 為 null 的員工補齊
UPDATE public.employees
SET user_id = supabase_user_id,
    updated_at = now()
WHERE user_id IS NULL
  AND supabase_user_id IS NOT NULL;

-- 統計、留 NOTICE 在 migration log
DO $$
DECLARE
  v_total integer;
  v_with_user_id integer;
  v_unfixable integer;
BEGIN
  SELECT count(*),
         count(user_id),
         count(*) FILTER (WHERE user_id IS NULL)
    INTO v_total, v_with_user_id, v_unfixable
    FROM public.employees
    WHERE status = 'active';

  RAISE NOTICE '[E1] employees.user_id 同步完成: total=% with_user_id=% unfixable=%',
    v_total, v_with_user_id, v_unfixable;

  IF v_unfixable > 0 THEN
    RAISE NOTICE '[E1] 仍有 % 筆 user_id 為 null（無 auth.users 對應、為 bot 或孤兒、需指揮官人工檢視）',
      v_unfixable;
  END IF;
END$$;

-- ============================================================
-- C. Trigger：未來 INSERT/UPDATE 自動同步 user_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_employee_user_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 如果 user_id 為 null 但 supabase_user_id 有值、自動回填
  IF NEW.user_id IS NULL AND NEW.supabase_user_id IS NOT NULL THEN
    NEW.user_id := NEW.supabase_user_id;
  END IF;

  -- 反向：如果只設了 user_id 沒設 supabase_user_id、補齊另一邊
  -- （保持兩欄位短期內同步、未來 DROP supabase_user_id 時直接拿掉這行）
  IF NEW.supabase_user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.supabase_user_id := NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_employee_user_id() IS
  'BEFORE INSERT/UPDATE trigger function：保持 employees.user_id 與 supabase_user_id 同步、'
  ' 防止任一邊脫鉤造成 RLS 失效。2026-05-02 E1 加入。'
  ' 未來 DROP supabase_user_id 後可移除。';

DROP TRIGGER IF EXISTS trg_sync_employee_user_id ON public.employees;

CREATE TRIGGER trg_sync_employee_user_id
BEFORE INSERT OR UPDATE OF user_id, supabase_user_id ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.sync_employee_user_id();

-- ============================================================
-- 紀錄到 _migrations 追蹤表
-- ============================================================

INSERT INTO public._migrations (name, executed_at)
VALUES ('20260502200000_fix_platform_admin_and_user_id.sql', now())
ON CONFLICT DO NOTHING;

COMMIT;
