-- =============================================
-- Migration: 重建 is_super_admin 讀 workspace_roles.is_admin（2026-04-23）
--
-- 背景：
--   舊 is_super_admin 讀 employees.permissions text[]、檢查 'super_admin' 是否在陣列裡。
--   這是 SSOT 破碎殘骸：登入流程早已改讀 role_tab_permissions + workspace_roles、
--   但 RLS 層的 is_super_admin() 還在看 JSONB/text[] 權限欄位。
--   為了 DROP employees.permissions 欄位、必須先把這個函數切到新真相來源。
--
-- 語義對齊：
--   舊：檢查當前 auth.uid() 對應的 employees.permissions 是否包含 'super_admin'
--   新：檢查當前 auth.uid() 對應的 employee.role_id → workspace_roles.is_admin = true
--
--   實務上：Corner 只有 1 個 workspace、is_admin 的 role 就等同於「該 workspace 的管理員」。
--   RLS policy 裡既存的 `OR is_super_admin()` bypass、原本是「全租戶 super」、
--   新語義是「該 workspace admin」。對 Corner 當前環境無行為差異（單租戶 + 單一 admin）。
--   多租戶上線後若需要「跨租戶平台管理員」、另案設計 is_platform_admin()、不混用此函數。
--
-- 不動：
--   所有呼叫 is_super_admin() 的 RLS policy（migrations 2025-12 ~ 2026-04 共數十處）
--   函數簽章保持 RETURNS boolean、STABLE、SECURITY DEFINER、不變。
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  current_uid uuid;
  is_admin_flag boolean;
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    RETURN false;
  END IF;

  -- 從 employees.role_id JOIN workspace_roles.is_admin 判斷
  -- 相容 supabase_user_id = auth.uid() 和 id = auth.uid() 兩種比對（沿用舊函數邏輯）
  SELECT wr.is_admin INTO is_admin_flag
  FROM public.employees e
  JOIN public.workspace_roles wr ON wr.id = e.role_id
  WHERE e.supabase_user_id = current_uid
     OR e.id = current_uid
  LIMIT 1;

  RETURN COALESCE(is_admin_flag, false);
END;
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  '當前用戶是否為管理員。讀 workspace_roles.is_admin（舊版讀 employees.permissions=''super_admin''、2026-04-23 切換）';

COMMIT;
