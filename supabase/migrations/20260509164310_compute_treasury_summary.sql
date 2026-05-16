-- RPC: compute_treasury_summary
-- 一次 SQL 算出指定期間內、workspace 的金庫總覽彙總。
-- 取代 src/app/(main)/finance/treasury/page.tsx 中 client-side 全撈 receipts/payment_requests/disbursement_orders 再 aggregate。
--
-- 邏輯（與 client-side 既有一致）：
-- - total_receipts = 期間內所有 receipts 的 actual_amount(fallback receipt_amount) 總和
-- - total_payments = 期間內 status IN ('approved','paid') 的 payment_requests amount 總和
-- - pending_receipts = 期間內 status='pending' 的 receipts 筆數
-- - pending_payments = 期間內 status='pending' 的 payment_requests 筆數
-- - pending_disbursements = 期間內 status='pending' 的 disbursement_orders 筆數
-- - balance = total_receipts − total_payments

CREATE OR REPLACE FUNCTION public.compute_treasury_summary(
  p_workspace_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS TABLE (
  total_receipts numeric,
  total_payments numeric,
  balance numeric,
  pending_receipts integer,
  pending_payments integer,
  pending_disbursements integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH receipt_agg AS (
    SELECT
      COALESCE(SUM(COALESCE(r.actual_amount, r.receipt_amount, 0)), 0)::numeric AS total,
      COUNT(*) FILTER (WHERE r.status = 'pending')::integer AS pending_count
    FROM public.receipts r
    WHERE r.workspace_id = p_workspace_id
      AND r.is_active IS NOT FALSE
      AND COALESCE(r.receipt_date, r.created_at::date) BETWEEN p_period_start AND p_period_end
  ),
  payment_agg AS (
    SELECT
      COALESCE(
        SUM(pr.amount) FILTER (WHERE pr.status IN ('approved', 'paid')),
        0
      )::numeric AS total,
      COUNT(*) FILTER (WHERE pr.status = 'pending')::integer AS pending_count
    FROM public.payment_requests pr
    WHERE pr.workspace_id = p_workspace_id
      AND pr.deleted_at IS NULL
      AND COALESCE(pr.request_date, pr.created_at::date) BETWEEN p_period_start AND p_period_end
  ),
  disbursement_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE d.status = 'pending')::integer AS pending_count
    FROM public.disbursement_orders d
    WHERE d.workspace_id = p_workspace_id
      AND d.deleted_at IS NULL
      AND COALESCE(d.disbursement_date, d.created_at::date) BETWEEN p_period_start AND p_period_end
  )
  SELECT
    receipt_agg.total AS total_receipts,
    payment_agg.total AS total_payments,
    (receipt_agg.total - payment_agg.total)::numeric AS balance,
    receipt_agg.pending_count AS pending_receipts,
    payment_agg.pending_count AS pending_payments,
    disbursement_agg.pending_count AS pending_disbursements
  FROM receipt_agg, payment_agg, disbursement_agg;
$$;

GRANT EXECUTE ON FUNCTION public.compute_treasury_summary(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION public.compute_treasury_summary(uuid, date, date) IS
  '金庫總覽彙總：一次算出期間內 total_receipts / total_payments / balance / pending counts。取代 client-side aggregate。';
