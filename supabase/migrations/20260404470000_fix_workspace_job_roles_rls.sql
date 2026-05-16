-- Fix workspace_job_roles RLS Policy
-- 修復日期：2026-04-04
-- 問題：原 Policy 使用 USING (true)，無租戶隔離
-- 解決：改為依據 auth.uid() 查詢 employees.workspace_id 過濾

-- 1. 刪除現有的寬鬆 policy
DROP POLICY IF EXISTS "workspace_job_roles_all" ON workspace_job_roles;

-- 2. SELECT Policy
CREATE POLICY "workspace_job_roles_tenant_select" 
ON workspace_job_roles
FOR SELECT
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- 3. INSERT Policy
CREATE POLICY "workspace_job_roles_tenant_insert" 
ON workspace_job_roles
FOR INSERT
WITH CHECK (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- 4. UPDATE Policy
CREATE POLICY "workspace_job_roles_tenant_update" 
ON workspace_job_roles
FOR UPDATE
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- 5. DELETE Policy
CREATE POLICY "workspace_job_roles_tenant_delete" 
ON workspace_job_roles
FOR DELETE
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);
