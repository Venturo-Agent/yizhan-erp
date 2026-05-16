-- 添加任务类型字段
-- 2026-03-18 08:09

-- 添加 task_type 列
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'individual' 
CHECK (task_type IN ('individual', 'workflow'));

-- 添加 workflow_id 列（关联 n8n 工作流）
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS workflow_template TEXT;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);

-- 注释
COMMENT ON COLUMN tasks.task_type IS '任务类型：individual=独立任务, workflow=工作流任务';
COMMENT ON COLUMN tasks.workflow_template IS '工作流模板名称（如：digital_human, event_planning）';
