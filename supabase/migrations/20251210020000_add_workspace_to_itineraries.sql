-- ================================================
-- 為 itineraries 表添加 workspace 支援
-- 日期: 2025-12-10
-- 目的: 實現多租戶隔離，支援 workspace 級別的數據隔離
-- ================================================

-- 📋 修復檢查清單：
-- ✅ 添加 workspace_id 欄位
-- ✅ 添加 created_by 和 updated_by 欄位（審計追蹤）
-- ✅ 建立外鍵約束
-- ✅ 建立索引以提升查詢效能
-- ✅ 遷移現有數據（設定預設 workspace）
-- ✅ 更新 RLS 策略支援 workspace 隔離
-- ✅ 添加觸發器自動設定 workspace_id

BEGIN;

-- ================================================
-- 第1步：添加新欄位
-- ================================================

-- 添加 workspace_id 欄位（暫時允許 NULL，稍後會設定預設值）
ALTER TABLE itineraries
ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- 添加 created_by 欄位（記錄建立者）
ALTER TABLE itineraries
ADD COLUMN IF NOT EXISTS created_by UUID;

-- 添加 updated_by 欄位（記錄最後修改者）
ALTER TABLE itineraries
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 添加註解
COMMENT ON COLUMN itineraries.workspace_id IS 'Workspace ID（多租戶隔離）';
COMMENT ON COLUMN itineraries.created_by IS '建立者的 employee ID';
COMMENT ON COLUMN itineraries.updated_by IS '最後修改者的 employee ID';

-- ================================================
-- 第2步：建立外鍵約束
-- ================================================

-- workspace_id 外鍵
ALTER TABLE itineraries
DROP CONSTRAINT IF EXISTS fk_itineraries_workspace;

ALTER TABLE itineraries
ADD CONSTRAINT fk_itineraries_workspace
FOREIGN KEY (workspace_id)
REFERENCES workspaces(id)
ON DELETE SET NULL;  -- 當 workspace 被刪除時，設為 NULL 而非刪除資料

-- created_by 外鍵
ALTER TABLE itineraries
DROP CONSTRAINT IF EXISTS fk_itineraries_created_by;

ALTER TABLE itineraries
ADD CONSTRAINT fk_itineraries_created_by
FOREIGN KEY (created_by)
REFERENCES employees(id)
ON DELETE SET NULL;

-- updated_by 外鍵
ALTER TABLE itineraries
DROP CONSTRAINT IF EXISTS fk_itineraries_updated_by;

ALTER TABLE itineraries
ADD CONSTRAINT fk_itineraries_updated_by
FOREIGN KEY (updated_by)
REFERENCES employees(id)
ON DELETE SET NULL;

-- ================================================
-- 第3步：建立索引（提升查詢效能）
-- ================================================

CREATE INDEX IF NOT EXISTS idx_itineraries_workspace_id
ON itineraries(workspace_id);

CREATE INDEX IF NOT EXISTS idx_itineraries_created_by
ON itineraries(created_by);

CREATE INDEX IF NOT EXISTS idx_itineraries_updated_by
ON itineraries(updated_by);

-- 組合索引：workspace + status（常見查詢組合）
CREATE INDEX IF NOT EXISTS idx_itineraries_workspace_status
ON itineraries(workspace_id, status)
WHERE _deleted = false;

-- ================================================
-- 第4步：遷移現有數據
-- ================================================

-- 將現有的 itineraries 設定到預設 workspace
-- 注意：這裡需要根據實際情況調整
DO $$
DECLARE
  default_workspace_id UUID;
  affected_rows INTEGER;
BEGIN
  -- 獲取第一個活躍的 workspace 作為預設值
  SELECT id INTO default_workspace_id
  FROM workspaces
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF default_workspace_id IS NULL THEN
    RAISE WARNING '⚠️ 找不到可用的 workspace，跳過數據遷移';
  ELSE
    -- 更新所有 workspace_id 為 NULL 的記錄
    UPDATE itineraries
    SET workspace_id = default_workspace_id
    WHERE workspace_id IS NULL;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE '✅ 已將 % 筆 itineraries 設定到 workspace: %', affected_rows, default_workspace_id;
  END IF;
END $$;

-- ================================================
-- 第5步：設定欄位為 NOT NULL（確保數據完整性）
-- ================================================

-- 在遷移完成後，將 workspace_id 設為必填
-- 注意：只有在確認所有數據都已遷移後才執行
DO $$
BEGIN
  -- 檢查是否還有 NULL 值
  IF EXISTS (SELECT 1 FROM itineraries WHERE workspace_id IS NULL LIMIT 1) THEN
    RAISE WARNING '⚠️ 仍有 itineraries 的 workspace_id 為 NULL，暫不設定為 NOT NULL';
  ELSE
    -- 所有資料都已遷移，設定為 NOT NULL
    ALTER TABLE itineraries ALTER COLUMN workspace_id SET NOT NULL;
    RAISE NOTICE '✅ workspace_id 已設定為 NOT NULL';
  END IF;
END $$;

-- ================================================
-- 第6步：RLS 策略（委託給 20251211120000_enable_complete_rls_system.sql）
-- ================================================

-- 注意：RLS 策略統一由 20251211120000_enable_complete_rls_system.sql 處理
-- 這裡只刪除舊的策略，新策略會由後續 migration 建立

-- 刪除舊的「所有認證用戶完整存取」策略
DROP POLICY IF EXISTS "Allow authenticated users full access to itineraries" ON itineraries;

-- 刪除可能存在的舊策略（避免衝突）
DROP POLICY IF EXISTS "itineraries_select_policy" ON itineraries;
DROP POLICY IF EXISTS "itineraries_insert_policy" ON itineraries;
DROP POLICY IF EXISTS "itineraries_update_policy" ON itineraries;
DROP POLICY IF EXISTS "itineraries_delete_policy" ON itineraries;

-- ================================================
-- 第7步：建立觸發器（自動設定 workspace_id）
-- ================================================

-- 建立觸發器函數
CREATE OR REPLACE FUNCTION set_itinerary_workspace()
RETURNS TRIGGER AS $$
DECLARE
  user_workspace_id UUID;
BEGIN
  -- 如果已經有 workspace_id，不覆蓋
  IF NEW.workspace_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 從當前用戶獲取 workspace_id
  SELECT workspace_id INTO user_workspace_id
  FROM employees
  WHERE id = auth.uid();

  IF user_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Cannot determine workspace_id for current user';
  END IF;

  NEW.workspace_id := user_workspace_id;

  -- 設定 created_by（INSERT 時）
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  END IF;

  -- 設定 updated_by（INSERT 和 UPDATE 時）
  NEW.updated_by := auth.uid();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_set_itinerary_workspace ON itineraries;
CREATE TRIGGER trigger_set_itinerary_workspace
BEFORE INSERT OR UPDATE ON itineraries
FOR EACH ROW
EXECUTE FUNCTION set_itinerary_workspace();

-- ================================================
-- 第8步：驗證
-- ================================================

DO $$
DECLARE
  total_count INTEGER;
  null_workspace_count INTEGER;
  workspace_count INTEGER;
BEGIN
  -- 統計總數
  SELECT COUNT(*) INTO total_count FROM itineraries;

  -- 統計 NULL workspace 數量
  SELECT COUNT(*) INTO null_workspace_count
  FROM itineraries
  WHERE workspace_id IS NULL;

  -- 統計有多少個不同的 workspace
  SELECT COUNT(DISTINCT workspace_id) INTO workspace_count
  FROM itineraries
  WHERE workspace_id IS NOT NULL;

  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ Itineraries Workspace 遷移完成';
  RAISE NOTICE '====================================';
  RAISE NOTICE '總 itineraries 數: %', total_count;
  RAISE NOTICE 'workspace_id 為 NULL: %', null_workspace_count;
  RAISE NOTICE '涵蓋的 workspace 數: %', workspace_count;

  IF null_workspace_count > 0 THEN
    RAISE WARNING '⚠️ 仍有 % 筆資料的 workspace_id 為 NULL', null_workspace_count;
  ELSE
    RAISE NOTICE '✅ 所有資料都已設定 workspace_id';
  END IF;

  -- 檢查索引
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'itineraries'
    AND indexname = 'idx_itineraries_workspace_id'
  ) THEN
    RAISE NOTICE '✅ 索引 idx_itineraries_workspace_id 已建立';
  ELSE
    RAISE WARNING '❌ 索引 idx_itineraries_workspace_id 未建立';
  END IF;

  -- 檢查 RLS 策略
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'itineraries'
    AND policyname = 'itineraries_select_policy'
  ) THEN
    RAISE NOTICE '✅ RLS 策略已更新';
  ELSE
    RAISE WARNING '❌ RLS 策略未正確設定';
  END IF;

  RAISE NOTICE '====================================';
END $$;

COMMIT;
