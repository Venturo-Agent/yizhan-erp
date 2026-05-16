-- 修正 user_badges 表的 foreign key，確保可以 JOIN badges 表
BEGIN;

-- 添加 badge_id 到 badges 表的 foreign key（如果不存在）
DO $$
BEGIN
  -- 檢查是否已存在 foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_badges_badge_id_fkey_badges'
    AND table_name = 'user_badges'
  ) THEN
    -- 刪除現有的 foreign key（如果有的話）
    ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS user_badges_badge_id_fkey;

    -- 添加新的 foreign key 連接到 badges 表
    ALTER TABLE user_badges ADD CONSTRAINT user_badges_badge_id_fkey_badges
      FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;
