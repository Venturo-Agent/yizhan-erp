-- ============================================
-- Migration: 建立 todo_columns 表（Trello 風格自訂欄位）
-- Date: 2026-04-12
-- ============================================

BEGIN;

-- 1. 建立 todo_columns 表
CREATE TABLE IF NOT EXISTS public.todo_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'gray', -- gray, gold, green, red, blue, purple
  sort_order INT NOT NULL DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE, -- 系統預設欄位（待辦/進行中/已完成）不可刪除
  mapped_status TEXT, -- 對應舊版 status: pending/in_progress/completed/cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todo_columns_workspace ON public.todo_columns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_todo_columns_sort ON public.todo_columns(workspace_id, sort_order);

COMMENT ON TABLE public.todo_columns IS '待辦事項看板欄位（Trello 風格）';
COMMENT ON COLUMN public.todo_columns.mapped_status IS '對應舊 status 欄位，系統欄位用';

-- 2. todos 加 column_id
ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS column_id UUID REFERENCES public.todo_columns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_todos_column ON public.todos(column_id);

-- 3. 為現有 workspace 建立預設 3 欄
DO $$
DECLARE
  ws RECORD;
  pending_col UUID;
  in_progress_col UUID;
  completed_col UUID;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    -- 檢查是否已有欄位
    IF NOT EXISTS (SELECT 1 FROM public.todo_columns WHERE workspace_id = ws.id) THEN
      -- 建立三個系統欄位
      INSERT INTO public.todo_columns (workspace_id, name, color, sort_order, is_system, mapped_status)
      VALUES (ws.id, '待辦', 'gray', 1, TRUE, 'pending')
      RETURNING id INTO pending_col;

      INSERT INTO public.todo_columns (workspace_id, name, color, sort_order, is_system, mapped_status)
      VALUES (ws.id, '進行中', 'gold', 2, TRUE, 'in_progress')
      RETURNING id INTO in_progress_col;

      INSERT INTO public.todo_columns (workspace_id, name, color, sort_order, is_system, mapped_status)
      VALUES (ws.id, '已完成', 'green', 3, TRUE, 'completed')
      RETURNING id INTO completed_col;

      -- 遷移現有 todos 到對應欄位
      UPDATE public.todos SET column_id = pending_col
        WHERE workspace_id = ws.id AND status = 'pending' AND column_id IS NULL;
      UPDATE public.todos SET column_id = in_progress_col
        WHERE workspace_id = ws.id AND status = 'in_progress' AND column_id IS NULL;
      UPDATE public.todos SET column_id = completed_col
        WHERE workspace_id = ws.id AND status = 'completed' AND column_id IS NULL;
      UPDATE public.todos SET column_id = pending_col
        WHERE workspace_id = ws.id AND column_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- 4. 新租戶 trigger：自動建立預設欄位
CREATE OR REPLACE FUNCTION public.create_default_todo_columns()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.todo_columns (workspace_id, name, color, sort_order, is_system, mapped_status)
  VALUES
    (NEW.id, '待辦', 'gray', 1, TRUE, 'pending'),
    (NEW.id, '進行中', 'gold', 2, TRUE, 'in_progress'),
    (NEW.id, '已完成', 'green', 3, TRUE, 'completed');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_default_todo_columns ON public.workspaces;
CREATE TRIGGER trg_create_default_todo_columns
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_todo_columns();

-- 5. RLS
ALTER TABLE public.todo_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "todo_columns_workspace_access" ON public.todo_columns;
CREATE POLICY "todo_columns_workspace_access" ON public.todo_columns
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMIT;
