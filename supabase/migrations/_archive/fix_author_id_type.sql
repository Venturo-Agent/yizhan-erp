
-- 1. 移除外鍵約束
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_author_id_fkey;
ALTER TABLE bulletins DROP CONSTRAINT IF EXISTS bulletins_author_id_fkey;

-- 2. 修改欄位類型為 TEXT
ALTER TABLE messages ALTER COLUMN author_id TYPE TEXT USING author_id::text;
ALTER TABLE bulletins ALTER COLUMN author_id TYPE TEXT USING author_id::text;

-- 3. 更新索引（如果需要）
-- 索引會自動適應新的類型

-- 完成！
SELECT 'author_id 類型已修改為 TEXT' as status;
    