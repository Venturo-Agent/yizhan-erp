-- 為 order_members 新增排序欄位
ALTER TABLE order_members ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- 為現有資料設定排序順序（按建立時間）
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at) as rn
  FROM order_members
)
UPDATE order_members
SET sort_order = ranked.rn
FROM ranked
WHERE order_members.id = ranked.id;

-- 建立索引以提升排序查詢效能
CREATE INDEX IF NOT EXISTS idx_order_members_sort_order ON order_members(order_id, sort_order);
