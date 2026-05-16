-- ============================================================================
-- 20260503160000_todos_add_description.sql
--
-- todos 表補 description 欄位。
-- 平移 KanbanPage demo 卡片正面跟 Dialog 詳情都會用到的「任務描述」。
-- nullable、不影響既有資料。
-- ============================================================================

ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.todos.description IS '任務描述（卡片正面預覽兩行 + Dialog 完整編輯）';
