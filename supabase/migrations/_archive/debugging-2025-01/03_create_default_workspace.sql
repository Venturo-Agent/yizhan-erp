-- ============================================
-- 建立預設工作空間和頻道
-- ============================================

BEGIN;

-- 插入預設工作空間
INSERT INTO workspaces (name, description, is_active)
VALUES ('總部辦公室', 'Venturo 總部工作空間', true)
ON CONFLICT DO NOTHING
RETURNING id;

-- 取得剛建立的工作空間 ID
DO $$
DECLARE
  workspace_id UUID;
BEGIN
  -- 取得預設工作空間的 ID
  SELECT id INTO workspace_id FROM workspaces WHERE name = '總部辦公室' LIMIT 1;

  -- 建立預設頻道
  -- 1. 一般頻道
  INSERT INTO channels (workspace_id, name, description, type)
  VALUES (workspace_id, '一般', '一般討論頻道', 'public')
  ON CONFLICT DO NOTHING;

  -- 2. 公告頻道
  INSERT INTO channels (workspace_id, name, description, type)
  VALUES (workspace_id, '公告', '重要公告頻道', 'public')
  ON CONFLICT DO NOTHING;

END $$;

COMMIT;

-- 驗證結果
SELECT
  'WORKSPACE CREATED' as status,
  w.name as workspace_name,
  COUNT(c.id) as channel_count
FROM workspaces w
LEFT JOIN channels c ON c.workspace_id = w.id
WHERE w.name = '總部辦公室'
GROUP BY w.id, w.name;

-- 顯示建立的頻道
SELECT
  'CHANNELS' as info,
  c.name as channel_name,
  c.type,
  w.name as workspace_name
FROM channels c
JOIN workspaces w ON c.workspace_id = w.id
WHERE w.name = '總部辦公室';
