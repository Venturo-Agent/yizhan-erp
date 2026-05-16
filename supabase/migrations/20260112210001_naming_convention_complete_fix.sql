-- =====================================================
-- Venturo ERP - 命名規範完整修復
-- 檔案：20260112210000_naming_convention_complete_fix.sql
-- 日期：2026-01-12
--
-- 目標：
-- 1. 為 tour_addons 添加 workspace_id
-- 2. 為 request_response_items 添加 workspace_id
-- 3. 重命名 2 個表格（改為 snake_case）
-- =====================================================

-- ============================================
-- 1. tour_addons 添加 workspace_id
-- ============================================

ALTER TABLE public.tour_addons
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

-- 從 tours 表填充現有記錄的 workspace_id
UPDATE public.tour_addons ta
SET workspace_id = t.workspace_id
FROM public.tours t
WHERE ta.tour_id = t.id
  AND ta.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tour_addons_workspace
ON public.tour_addons(workspace_id);

COMMENT ON COLUMN public.tour_addons.workspace_id IS '工作空間 ID（用於資料隔離）';

-- ============================================
-- 2. request_response_items 添加 workspace_id
-- ============================================

ALTER TABLE public.request_response_items
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

-- 從 tour_requests 表填充現有記錄的 workspace_id（透過 request_responses → tour_requests）
UPDATE public.request_response_items rri
SET workspace_id = tr.workspace_id
FROM public.request_responses rr
JOIN public.tour_requests tr ON rr.request_id = tr.id
WHERE rri.response_id = rr.id
  AND rri.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_request_response_items_workspace
ON public.request_response_items(workspace_id);

COMMENT ON COLUMN public.request_response_items.workspace_id IS '工作空間 ID（用於資料隔離）';

-- ============================================
-- 3. 表格重命名（2 個）
-- ============================================

-- 重命名 Itinerary_Permissions -> itinerary_permissions（僅在舊表存在且新表不存在時）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Itinerary_Permissions' AND table_schema='public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='itinerary_permissions' AND table_schema='public') THEN
    ALTER TABLE public."Itinerary_Permissions" RENAME TO itinerary_permissions;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Tour_Expenses' AND table_schema='public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tour_expenses' AND table_schema='public') THEN
    ALTER TABLE public."Tour_Expenses" RENAME TO tour_expenses;
  END IF;
END $$;
