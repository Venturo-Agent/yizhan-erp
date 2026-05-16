-- 团损益报表函数：分离预估值和实际值
CREATE OR REPLACE FUNCTION get_tour_pnl(
  p_workspace_id UUID,
  p_year_start DATE,
  p_year_end DATE
)
RETURNS TABLE (
  id TEXT,
  code TEXT,
  name TEXT,
  departure_date DATE,
  return_date DATE,
  status TEXT,
  max_participants INTEGER,
  estimated_cost NUMERIC,
  estimated_revenue NUMERIC,
  estimated_profit NUMERIC,
  actual_revenue NUMERIC,
  actual_cost NUMERIC,
  actual_profit NUMERIC,
  revenue_diff NUMERIC,
  cost_diff NUMERIC,
  closing_date DATE
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    t.id,
    t.code,
    t.name,
    t.departure_date,
    t.return_date,
    t.status,
    t.max_participants,
    
    -- 预估值（从 tours 表）
    t.total_cost as estimated_cost,
    t.total_revenue as estimated_revenue,
    t.profit as estimated_profit,
    
    -- 实际值（动态计算）
    COALESCE((
      SELECT SUM(r.total_amount) 
      FROM receipts r 
      WHERE r.tour_id = t.id AND r.deleted_at IS NULL
    ), 0) as actual_revenue,
    
    COALESCE((
      SELECT SUM(pr.amount) 
      FROM payment_requests pr 
      WHERE pr.tour_id = t.id
    ), 0) as actual_cost,
    
    COALESCE((
      SELECT SUM(r.total_amount) 
      FROM receipts r 
      WHERE r.tour_id = t.id AND r.deleted_at IS NULL
    ), 0) - COALESCE((
      SELECT SUM(pr.amount) 
      FROM payment_requests pr 
      WHERE pr.tour_id = t.id
    ), 0) as actual_profit,
    
    -- 差异
    COALESCE((
      SELECT SUM(r.total_amount) 
      FROM receipts r 
      WHERE r.tour_id = t.id AND r.deleted_at IS NULL
    ), 0) - t.total_revenue as revenue_diff,
    
    COALESCE((
      SELECT SUM(pr.amount) 
      FROM payment_requests pr 
      WHERE pr.tour_id = t.id
    ), 0) - t.total_cost as cost_diff,
    
    t.closing_date
    
  FROM tours t
  WHERE t.workspace_id = p_workspace_id
    AND t.departure_date BETWEEN p_year_start AND p_year_end
    AND t.status != 'cancelled'
  ORDER BY t.departure_date DESC;
$$;
