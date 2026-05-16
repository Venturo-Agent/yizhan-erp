-- ============================================================================
-- Migration: 請款明細關聯需求單
-- 讓請款單明細可以關聯到需求單，追蹤每筆費用的來源
-- ============================================================================

-- 1. payment_request_items 加入 tour_request_id 欄位
ALTER TABLE payment_request_items
ADD COLUMN IF NOT EXISTS tour_request_id UUID REFERENCES tour_requests(id) ON DELETE SET NULL;

-- 2. 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_payment_request_items_tour_request_id 
ON payment_request_items(tour_request_id) 
WHERE tour_request_id IS NOT NULL;

-- 3. 建立 View（僅在 category 欄位存在時）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tour_requests' AND column_name='category') THEN
    CREATE OR REPLACE VIEW tour_request_payment_summary AS
    SELECT
      tr.id AS tour_request_id,
      tr.tour_id,
      tr.supplier_id,
      tr.supplier_name,
      tr.category,
      tr.title,
      tr.estimated_cost,
      tr.final_cost,
      COALESCE(SUM(pri.subtotal), 0) AS total_requested,
      COALESCE(SUM(
        CASE WHEN pr.status = 'paid' THEN pri.subtotal ELSE 0 END
      ), 0) AS total_paid
    FROM tour_requests tr
    LEFT JOIN payment_request_items pri ON pri.tour_request_id = tr.id
    LEFT JOIN payment_requests pr ON pri.request_id = pr.id
    GROUP BY tr.id, tr.tour_id, tr.supplier_id, tr.supplier_name,
             tr.category, tr.title, tr.estimated_cost, tr.final_cost;
    ALTER VIEW tour_request_payment_summary OWNER TO authenticated;
  END IF;
END $$;

COMMENT ON COLUMN payment_request_items.tour_request_id IS '關聯的需求單 ID，用於追蹤請款來源';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name='tour_request_payment_summary') THEN
    COMMENT ON VIEW tour_request_payment_summary IS '需求單付款摘要，顯示每筆需求單的請款和付款狀態';
  END IF;
END $$;
