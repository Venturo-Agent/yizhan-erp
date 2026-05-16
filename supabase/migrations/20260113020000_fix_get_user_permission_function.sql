-- 修復 get_user_permission 函數和 RLS 政策
-- 將所有 Itinerary_Permissions 引用改為 itinerary_permissions (snake_case)

BEGIN;

-- 1. 重新建立 get_user_permission 函數
CREATE OR REPLACE FUNCTION get_user_permission(p_user_id UUID, p_itinerary_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- 查詢 itinerary_permissions 表（使用正確的 snake_case 表名）
  RETURN (
    SELECT permission_level FROM itinerary_permissions
    WHERE itinerary_permissions.user_id = p_user_id
      AND itinerary_permissions.itinerary_id = p_itinerary_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 修復 itineraries 表的 RLS 政策
DROP POLICY IF EXISTS "Users can view itineraries they are a part of" ON public.itineraries;

CREATE POLICY "Users can view itineraries they are a part of"
ON public.itineraries FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM itinerary_permissions
    WHERE itinerary_id = itineraries.id
  )
  OR workspace_id = get_current_user_workspace()
  OR is_super_admin()
);

-- 3. 修復 itinerary_permissions 表的 RLS 政策
DROP POLICY IF EXISTS "Users can see their own permissions" ON public.itinerary_permissions;
DROP POLICY IF EXISTS "Editors can manage permissions for their itineraries" ON public.itinerary_permissions;

CREATE POLICY "Users can see their own permissions"
ON public.itinerary_permissions FOR SELECT
USING (
  auth.uid() = user_id
  OR is_super_admin()
);

CREATE POLICY "Editors can manage permissions for their itineraries"
ON public.itinerary_permissions FOR ALL
USING (
  get_user_permission(auth.uid(), itinerary_permissions.itinerary_id) = 'editor'
  OR is_super_admin()
)
WITH CHECK (
  get_user_permission(auth.uid(), itinerary_permissions.itinerary_id) = 'editor'
  OR is_super_admin()
);

COMMIT;
