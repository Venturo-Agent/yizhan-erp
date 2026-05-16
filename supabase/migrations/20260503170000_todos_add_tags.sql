-- ============================================================================
-- 20260503170000_todos_add_tags.sql
--
-- todos 表補 tags text[] 欄位、還原個人標籤功能。
-- 之前 quick-actions 三個 tab 從 tag 改成 share、tag 功能消失。
-- 現在還原：tags 是純文字陣列、每個 todo 自帶幾個自定義標籤。
-- IF NOT EXISTS、不影響既有資料。
-- ============================================================================

ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.todos.tags IS '任務個人標籤陣列（自定義、跟 visibility 共享機制無關）';
