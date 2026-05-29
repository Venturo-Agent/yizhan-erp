-- ─────────────────────────────────────────────────────────────────────────────
-- 代辦看板個人化 P1：schema 加欄（純加欄、不動 RLS、不破壞現有）
--
-- 寫於：2026-05-29
-- 對應：workspace/架構整理/2026-05-29-代辦看板個人化-spec.md
-- Why：todo_columns 自建立起就全 workspace 共用（無 user 維度）。改成「每人一組個人欄
--   + 一個系統『指派給我』欄」；指派任務時建配對的兩張卡（內容雙向同步、完成/欄位各自獨立）。
--
-- 本階段只加欄、可安全先上（舊 code 忽略新欄、RLS 不變）。
-- owner 填值 / RLS 個人隔離 / drop 舊共用欄 留到 P3 / P6。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. todo_columns 個人化 + 系統欄標記
ALTER TABLE public.todo_columns
  ADD COLUMN IF NOT EXISTS owner_employee_id UUID,
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS system_kind TEXT;

-- 每人最多一個 system_kind 欄（如 assigned_inbox）
CREATE UNIQUE INDEX IF NOT EXISTS uq_todo_columns_owner_system_kind
  ON public.todo_columns(workspace_id, owner_employee_id, system_kind)
  WHERE system_kind IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_todo_columns_owner
  ON public.todo_columns(workspace_id, owner_employee_id);

COMMENT ON COLUMN public.todo_columns.owner_employee_id IS
  '個人看板擁有者（employee id、對映 todos.created_by 同一身份）。NULL = 舊 workspace 共用欄、P6 淘汰';
COMMENT ON COLUMN public.todo_columns.system_kind IS
  'assigned_inbox = 系統「指派給我」欄、不可使用者新增/刪除/改名';

-- 2. todos 配對欄位（指派的建立者卡 + 被指派卡共用同一值）
ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS linked_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_todos_linked_group
  ON public.todos(linked_group_id) WHERE linked_group_id IS NOT NULL;

COMMENT ON COLUMN public.todos.linked_group_id IS
  '指派配對：建立者卡 + 被指派卡共用同一值。內容雙向同步、completed/column_id 各卡獨立';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP INDEX IF EXISTS public.uq_todo_columns_owner_system_kind;
-- DROP INDEX IF EXISTS public.idx_todo_columns_owner;
-- DROP INDEX IF EXISTS public.idx_todos_linked_group;
-- ALTER TABLE public.todo_columns DROP COLUMN IF EXISTS owner_employee_id, DROP COLUMN IF EXISTS is_system, DROP COLUMN IF EXISTS system_kind;
-- ALTER TABLE public.todos DROP COLUMN IF EXISTS linked_group_id;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
