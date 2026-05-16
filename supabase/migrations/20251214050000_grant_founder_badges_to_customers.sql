-- 為客戶頒發創始測試會員徽章
-- 原本的 user_badges 表格 (user_id TEXT, badge_id TEXT) 被改成了
-- (user_id UUID -> profiles, badge_id UUID -> badges)
-- 所以我們需要創建一個新的 customer_badges 表格

BEGIN;

-- 1. 創建 customer_badges 表格（專門給客戶用）
-- 注意：customers.id 是 TEXT 類型，不是 UUID
CREATE TABLE IF NOT EXISTS customer_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  badge_id TEXT NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, badge_id)
);

-- 添加 customer_id 的外鍵約束（如果 customers 表存在）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE customer_badges
    ADD CONSTRAINT customer_badges_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- 約束已存在，忽略錯誤
END $$;

-- 2. 為所有有 email 的客戶頒發 FOUNDER_BETA 徽章
-- 這些是真正使用前端註冊的客戶
INSERT INTO customer_badges (customer_id, badge_id)
SELECT c.id, 'FOUNDER_BETA'
FROM customers c
WHERE c.email IS NOT NULL
  AND c.email != ''
  AND NOT EXISTS (
    SELECT 1 FROM customer_badges cb
    WHERE cb.customer_id = c.id AND cb.badge_id = 'FOUNDER_BETA'
  )
ON CONFLICT (customer_id, badge_id) DO NOTHING;

COMMIT;
