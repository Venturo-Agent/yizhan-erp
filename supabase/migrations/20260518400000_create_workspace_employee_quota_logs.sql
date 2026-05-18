-- ============================================================
-- 員工帳號配額變更紀錄
--
-- 為什麼：
--   新增租戶預設員工帳號上限為 5。
--   每次追加或調整上限時需要留下完整記錄（誰、何時、從幾改成幾）。
--
-- 寫入點：
--   1. POST /api/tenants/create        — 初始建立，記錄首次設定值
--   2. PATCH /api/workspaces/[id]/employee-quota — 後續每次調整
--
-- 讀取：只走 admin client（service_role），不開用戶 policy。
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.workspace_employee_quota_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  changed_by   uuid        REFERENCES public.employees(id) ON DELETE SET NULL, -- 紅線 B：指 employees.id
  old_quota    int         NULL, -- NULL = 變更前無限制
  new_quota    int         NULL, -- NULL = 改回無限制
  reason       text,             -- 備註（可空）
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.workspace_employee_quota_logs IS '員工帳號配額變更紀錄';
COMMENT ON COLUMN public.workspace_employee_quota_logs.changed_by  IS '操作員工（紅線 B：REFERENCES employees.id）';
COMMENT ON COLUMN public.workspace_employee_quota_logs.old_quota   IS '變更前配額，NULL = 無限制';
COMMENT ON COLUMN public.workspace_employee_quota_logs.new_quota   IS '變更後配額，NULL = 無限制';

-- index：詳情頁查詢單一租戶的歷史
CREATE INDEX IF NOT EXISTS idx_quota_logs_workspace
  ON public.workspace_employee_quota_logs(workspace_id, created_at DESC);

-- RLS：ENABLE（無用戶 policy = 只有 service_role 能讀寫）
ALTER TABLE public.workspace_employee_quota_logs ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TABLE IF EXISTS public.workspace_employee_quota_logs;
-- COMMIT;
