-- 檢查並為所有租戶補齊「管理員」職務（2026-04-22）
-- 目的：確保每個租戶都有「管理員」職務定義
-- 操作：
-- 1. 掃描所有租戶
-- 2. 檢查是否有 is_admin=true 的職務
-- 3. 沒有則建立（名稱為「管理員」）
-- 4. 設定預設權限

BEGIN;

-- 臨時表：存放缺失「管理員」職務的租戶
CREATE TEMP TABLE workspaces_missing_admin_role AS
SELECT w.id as workspace_id, w.code as workspace_code
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_roles wr
  WHERE wr.workspace_id = w.id
  AND wr.is_admin = true
);

-- 檢查結果（日誌用）
DO $$
DECLARE
  missing_count INT;
BEGIN
  SELECT COUNT(*) INTO missing_count FROM workspaces_missing_admin_role;

  IF missing_count > 0 THEN
    RAISE NOTICE 'Found % workspaces missing admin role', missing_count;
  ELSE
    RAISE NOTICE 'All workspaces already have admin role defined';
  END IF;
END $$;

-- 為缺失的租戶建立「管理員」職務
DO $$
DECLARE
  ws_record RECORD;
  admin_role_id UUID;
BEGIN
  FOR ws_record IN SELECT * FROM workspaces_missing_admin_role
  LOOP
    -- 建立管理員職務
    INSERT INTO workspace_roles (workspace_id, name, description, is_admin, sort_order)
    VALUES (
      ws_record.workspace_id,
      '管理員',
      '系統管理員，擁有全部功能權限',
      true,
      1
    )
    RETURNING id INTO admin_role_id;

    RAISE NOTICE 'Created admin role for workspace %: %', ws_record.workspace_code, admin_role_id;
  END LOOP;
END $$;

-- 查看最終結果
SELECT
  w.id as workspace_id,
  w.code as workspace_code,
  w.name as workspace_name,
  COUNT(CASE WHEN wr.is_admin = true THEN 1 END) as admin_role_count,
  STRING_AGG(wr.name, ', ') as role_names
FROM workspaces w
LEFT JOIN workspace_roles wr ON w.id = wr.workspace_id
GROUP BY w.id, w.code, w.name
ORDER BY w.code;

COMMIT;
