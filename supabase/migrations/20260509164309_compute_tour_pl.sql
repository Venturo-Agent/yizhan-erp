-- RPC: compute_tour_pl
-- 一次 SQL 算出單一 tour 的 P&L（revenue / cost / gross_profit / margin）。
-- 取代 src/app/(main)/tours/_components/tour-overview.tsx 中 client-side 撈 receipts + payment_requests 自己 sum。
--
-- 邏輯（與 client-side 既有一致）：
-- - 收入（estimated）= 該 tour 名下所有 active receipts 的 actual_amount（fallback receipt_amount）總和
-- - 收入（confirmed）= 同上但只含 status='confirmed'
-- - 成本 = 該 tour 名下所有 payment_requests amount 總和、排除 request_type 含 'bonus' / '獎金'
-- - 毛利 = confirmed_revenue − cost
-- - margin = 毛利 / confirmed_revenue（0 收入時為 0）

CREATE OR REPLACE FUNCTION public.compute_tour_pl(
  p_tour_id text
)
RETURNS TABLE (
  estimated_revenue numeric,
  confirmed_revenue numeric,
  cost numeric,
  gross_profit numeric,
  estimated_profit numeric,
  margin numeric,
  order_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH tour_orders AS (
    SELECT id FROM public.orders WHERE tour_id = p_tour_id
  ),
  tour_receipts AS (
    SELECT
      r.status,
      COALESCE(r.actual_amount, r.receipt_amount, 0)::numeric AS amt
    FROM public.receipts r
    WHERE r.is_active IS NOT FALSE
      AND (
        r.tour_id = p_tour_id
        OR r.order_id IN (SELECT id FROM tour_orders)
      )
  ),
  tour_costs AS (
    SELECT COALESCE(pr.amount, 0)::numeric AS amt
    FROM public.payment_requests pr
    WHERE pr.tour_id = p_tour_id
      AND pr.deleted_at IS NULL
      AND COALESCE(LOWER(pr.request_type), '') NOT LIKE '%bonus%'
      AND COALESCE(pr.request_type, '') NOT LIKE '%獎金%'
  ),
  agg AS (
    SELECT
      COALESCE(SUM(amt), 0)::numeric AS estimated_revenue,
      COALESCE(SUM(amt) FILTER (WHERE status = 'confirmed'), 0)::numeric AS confirmed_revenue
    FROM tour_receipts
  ),
  cost_agg AS (
    SELECT COALESCE(SUM(amt), 0)::numeric AS cost FROM tour_costs
  ),
  order_agg AS (
    SELECT COUNT(*)::integer AS order_count FROM tour_orders
  )
  SELECT
    agg.estimated_revenue,
    agg.confirmed_revenue,
    cost_agg.cost,
    (agg.confirmed_revenue - cost_agg.cost)::numeric AS gross_profit,
    (agg.estimated_revenue - cost_agg.cost)::numeric AS estimated_profit,
    CASE
      WHEN agg.confirmed_revenue > 0
        THEN ROUND(((agg.confirmed_revenue - cost_agg.cost) / agg.confirmed_revenue * 100)::numeric, 2)
      ELSE 0::numeric
    END AS margin,
    order_agg.order_count
  FROM agg, cost_agg, order_agg;
$$;

GRANT EXECUTE ON FUNCTION public.compute_tour_pl(text) TO authenticated;

COMMENT ON FUNCTION public.compute_tour_pl(text) IS
  'Tour 詳情頁 P&L：一次算出 estimated/confirmed revenue、cost、gross_profit、margin。取代 client-side aggregate。';
