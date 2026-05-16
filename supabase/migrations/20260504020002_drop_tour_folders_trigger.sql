-- ============================================================================
-- 修復：folders 表已於 2026-04-22 刪除，但 tours 表的 trigger 仍在嘗試寫入 folders
-- 導致開團時報錯：relation "folders" does not exist (42P01)
-- ============================================================================

-- 1. 刪除掛在 tours 表上的 trigger
DROP TRIGGER IF EXISTS tr_create_tour_folders ON public.tours;

-- 2. 刪除對應的 trigger 函式
DROP FUNCTION IF EXISTS public.create_tour_folders();

-- 3. 清理相關的 tour_folder_templates 表（如果還存在）
DROP TABLE IF EXISTS public.tour_folder_templates CASCADE;
