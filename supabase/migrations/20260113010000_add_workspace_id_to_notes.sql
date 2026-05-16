-- 為 notes 表添加 workspace_id 欄位
BEGIN;

-- 1. 添加 workspace_id 欄位
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

-- 2. 根據 user_id (employee) 回填 workspace_id
UPDATE public.notes n
SET workspace_id = e.workspace_id
FROM public.employees e
WHERE n.user_id = e.id
AND n.workspace_id IS NULL;

-- 3. 添加索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON public.notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);

COMMIT;
