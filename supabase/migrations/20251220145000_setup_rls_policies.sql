-- 設定 RLS 安全策略
-- 執行時間: 在 Itinerary_Permissions 表填充完畢後

-- =====================================================
-- A. 針對 itineraries 表的策略
-- =====================================================

-- 先移除舊的寬鬆政策
DROP POLICY IF EXISTS "Allow authenticated users full access to itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.itineraries;

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE "itineraries" ENABLE ROW LEVEL SECURITY;

-- 讀取政策：只允許被授權的使用者讀取他們參與的行程
CREATE POLICY "Users can view itineraries they are a part of"
ON "itineraries" FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM "Itinerary_Permissions"
    WHERE itinerary_id = "itineraries".id
  )
);

-- 更新政策：只有 editor 權限者可以更新行程
CREATE POLICY "Editors can update their itineraries"
ON "itineraries" FOR UPDATE
USING (
  get_user_permission(auth.uid(), id) = 'editor'
);

-- 新增政策：認證用戶可以建立新行程
CREATE POLICY "Authenticated users can insert itineraries"
ON "itineraries" FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 刪除政策：只有 editor 權限者可以刪除行程
CREATE POLICY "Editors can delete itineraries"
ON "itineraries" FOR DELETE
USING (
  get_user_permission(auth.uid(), id) = 'editor'
);

-- =====================================================
-- B. 針對 Tour_Expenses 表的策略
-- =====================================================

ALTER TABLE "Tour_Expenses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can manage expenses for their itineraries"
ON "Tour_Expenses" FOR ALL
USING (
  get_user_permission(auth.uid(), "Tour_Expenses".itinerary_id) = 'editor'
);

-- =====================================================
-- C. 針對 Itinerary_Permissions 表的策略
-- =====================================================

ALTER TABLE "Itinerary_Permissions" ENABLE ROW LEVEL SECURITY;

-- 讀取政策：使用者能看到自己的權限
CREATE POLICY "Users can see their own permissions"
ON "Itinerary_Permissions" FOR SELECT
USING (
  auth.uid() = user_id
);

-- 管理政策：editor 可以管理行程的權限
CREATE POLICY "Editors can manage permissions for their itineraries"
ON "Itinerary_Permissions" FOR ALL
USING (
  get_user_permission(auth.uid(), "Itinerary_Permissions".itinerary_id) = 'editor'
)
WITH CHECK (
  get_user_permission(auth.uid(), "Itinerary_Permissions".itinerary_id) = 'editor'
);
