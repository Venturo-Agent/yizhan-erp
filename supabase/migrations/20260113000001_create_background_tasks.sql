-- Background Tasks Table
-- 用於儲存背景任務佇列

BEGIN;

-- 建立任務狀態 enum（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
    END IF;
END$$;

-- 建立任務優先級 enum（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'critical');
    END IF;
END$$;

-- 建立背景任務表
CREATE TABLE IF NOT EXISTS public.background_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status task_status NOT NULL DEFAULT 'pending',
    priority task_priority NOT NULL DEFAULT 'normal',
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.employees(id),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引：加速查詢待處理任務
CREATE INDEX IF NOT EXISTS idx_background_tasks_status_scheduled
ON public.background_tasks(status, scheduled_at)
WHERE status = 'pending';

-- 索引：按 workspace 查詢
CREATE INDEX IF NOT EXISTS idx_background_tasks_workspace
ON public.background_tasks(workspace_id);

-- 索引：按類型查詢
CREATE INDEX IF NOT EXISTS idx_background_tasks_type
ON public.background_tasks(type);

-- 啟用 RLS
ALTER TABLE public.background_tasks ENABLE ROW LEVEL SECURITY;

-- RLS 政策：用戶只能看到自己 workspace 的任務
DROP POLICY IF EXISTS "background_tasks_select" ON public.background_tasks;
DROP POLICY IF EXISTS "background_tasks_insert" ON public.background_tasks;
DROP POLICY IF EXISTS "background_tasks_update" ON public.background_tasks;
DROP POLICY IF EXISTS "background_tasks_delete" ON public.background_tasks;

DROP POLICY IF EXISTS "background_tasks_select" ON public.background_tasks;
CREATE POLICY "background_tasks_select" ON public.background_tasks FOR SELECT
USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
);

DROP POLICY IF EXISTS "background_tasks_insert" ON public.background_tasks;
CREATE POLICY "background_tasks_insert" ON public.background_tasks FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "background_tasks_update" ON public.background_tasks;
CREATE POLICY "background_tasks_update" ON public.background_tasks FOR UPDATE
USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
);

DROP POLICY IF EXISTS "background_tasks_delete" ON public.background_tasks;
CREATE POLICY "background_tasks_delete" ON public.background_tasks FOR DELETE
USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
);

-- 註解
COMMENT ON TABLE public.background_tasks IS '背景任務佇列';
COMMENT ON COLUMN public.background_tasks.type IS '任務類型（如 generate_report, send_email）';
COMMENT ON COLUMN public.background_tasks.payload IS '任務參數（JSON 格式）';
COMMENT ON COLUMN public.background_tasks.status IS '任務狀態';
COMMENT ON COLUMN public.background_tasks.priority IS '優先級（critical > high > normal > low）';
COMMENT ON COLUMN public.background_tasks.attempts IS '已嘗試次數';
COMMENT ON COLUMN public.background_tasks.max_attempts IS '最大嘗試次數';
COMMENT ON COLUMN public.background_tasks.scheduled_at IS '排程執行時間';
COMMENT ON COLUMN public.background_tasks.error IS '錯誤訊息（如果失敗）';
COMMENT ON COLUMN public.background_tasks.result IS '執行結果（JSON 格式）';

COMMIT;
