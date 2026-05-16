-- 合約綁訂單：加 order_id 欄位
-- Why：業務邏輯上一份合約 = 一張訂單（10 份既有合約 100% 都是單一訂單）
-- entry 從「團詳情/合約分頁」搬到「訂單列表/合約按鈕」
-- 純加法、不刪欄位、不刪資料

-- 1. 加欄位（型別配合 orders.id = text；nullable 對齊 ON DELETE SET NULL）
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS order_id text REFERENCES orders(id) ON DELETE SET NULL;

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_contracts_order_id ON contracts(order_id);

-- 3. Backfill 既有合約：每份反查 member_ids[] 第一個團員的 order_id
UPDATE contracts c
SET order_id = (
  SELECT om.order_id
  FROM order_members om
  WHERE om.id = ANY(c.member_ids)
  LIMIT 1
)
WHERE c.order_id IS NULL
  AND c.member_ids IS NOT NULL
  AND array_length(c.member_ids, 1) > 0;
