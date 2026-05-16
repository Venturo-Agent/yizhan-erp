-- RPC: compute_period_balances
-- 一次 SQL 算出指定期間內、所有損益科目（revenue / expense / cost）的借貸合計與餘額。
-- 取代 src/app/api/accounting/period-closing/route.ts 中 N+1 撈 journal_lines 的 client-side 計算。
--
-- 輸入：workspace_id + 期間
-- 輸出：每個損益科目的 debit / credit / balance（已依 account_type 套上正負號）
-- 過濾：只算 status = 'posted' 的 voucher、和該期間內的 voucher_date

CREATE OR REPLACE FUNCTION public.compute_period_balances(
  p_workspace_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_type text,
  total_debit numeric,
  total_credit numeric,
  balance numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH posted_lines AS (
    SELECT
      jl.account_id,
      jl.debit_amount,
      jl.credit_amount
    FROM public.journal_lines jl
    INNER JOIN public.journal_vouchers jv ON jv.id = jl.voucher_id
    WHERE jv.workspace_id = p_workspace_id
      AND jv.status = 'posted'
      AND jv.voucher_date BETWEEN p_period_start AND p_period_end
  )
  SELECT
    ca.id AS account_id,
    ca.code AS account_code,
    ca.name AS account_name,
    ca.account_type,
    COALESCE(SUM(pl.debit_amount), 0)::numeric AS total_debit,
    COALESCE(SUM(pl.credit_amount), 0)::numeric AS total_credit,
    CASE
      WHEN ca.account_type = 'revenue'
        THEN COALESCE(SUM(pl.credit_amount - pl.debit_amount), 0)::numeric
      ELSE COALESCE(SUM(pl.debit_amount - pl.credit_amount), 0)::numeric
    END AS balance
  FROM public.chart_of_accounts ca
  LEFT JOIN posted_lines pl ON pl.account_id = ca.id
  WHERE ca.workspace_id = p_workspace_id
    AND ca.account_type IN ('revenue', 'expense', 'cost')
  GROUP BY ca.id, ca.code, ca.name, ca.account_type
  HAVING ABS(
    CASE
      WHEN ca.account_type = 'revenue'
        THEN COALESCE(SUM(pl.credit_amount - pl.debit_amount), 0)
      ELSE COALESCE(SUM(pl.debit_amount - pl.credit_amount), 0)
    END
  ) > 0.01
  ORDER BY ca.code;
$$;

GRANT EXECUTE ON FUNCTION public.compute_period_balances(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION public.compute_period_balances(uuid, date, date) IS
  '期末結轉用：一次算出所有損益科目（revenue/expense/cost）在指定期間內的餘額。取代 N+1 client-side loop。';
