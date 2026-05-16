-- =====================================================
-- 新增 increment_points 函數
-- 日期: 2025-12-13
-- 目的: 提供安全的點數增減操作
-- =====================================================

-- 建立 increment_points 函數
-- 使用 TEXT 類型的 customer_id 以匹配 customers.id
CREATE OR REPLACE FUNCTION increment_points(customer_id_param TEXT, points_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET total_points = COALESCE(total_points, 0) + points_param
  WHERE id = customer_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_points(TEXT, INTEGER) IS '安全地增減客戶點數（正數增加，負數減少）';

-- 確認相關表格的欄位類型正確（僅作驗證，不執行實際修改）
-- eyeline_submissions.user_id: 已是 TEXT
-- user_points_transactions.user_id: 已是 TEXT
-- customization_requests.customer_id: 已是 TEXT
-- user_badges.user_id: 已是 TEXT
