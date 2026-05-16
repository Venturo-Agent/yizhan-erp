-- ============================================================================
-- 20260503190000_unify_finance_numeric_to_20_2.sql
--
-- 統一所有 finance 金額欄位精度到 numeric(20, 2)、上限 NT$1 京（10^17）
--
-- # 背景
-- finance schema 之前有三種上限混雜：
--   - (10, 2) 撞 1 億：30 個欄位（orders / receipts / tours / payment_request_items ...）
--   - (12, 2) 撞 100 億：9 個欄位（payment_requests / quotes ...）
--   - (15, 2) 撞 10 兆：10 個欄位（accounting_* / journal_* / transportation_rates）
-- 撞 1 億的欄位在 B2B 大型團體（包機 / 大型獎勵旅遊）會真實踩到。
-- 已實際發生：2026-05-02 user 試新增請款項目時觸發 `numeric field overflow`。
--
-- # 決策（William 親口）
-- 全部統一 numeric(20, 2)。手抖防呆走業務層的請款/收款確認流程、不靠 DB 限制。
--
-- # 順手修：payment_request_items.request_id FK
-- 之前是 ON DELETE RESTRICT、導致 service 層 try/catch rollback 路徑失效（請款建好但
-- items insert 失敗時、deletePaymentRequest 被 FK 擋住、留下 orphan 請款單）。
-- 改成 CASCADE：parent 請款單刪除時、items 一併消失（這本來就是業務該有的行為）。
--
-- # 風險
-- ALTER COLUMN 升級 numeric precision 是 metadata-only（不 rewrite table）、瞬間完成。
-- Drop/recreate trigger / view / FK 也是 metadata-only。整個 migration 秒完成。
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. 砍掉依賴物件（最後重建）
-- ----------------------------------------------------------------------------

-- 0a. 依賴 view
DROP VIEW IF EXISTS public.orders_invoice_summary;

-- 0b. column-level trigger（UPDATE OF xxx 會卡 ALTER TYPE）
DROP TRIGGER IF EXISTS trigger_update_payment_request_total_on_update ON public.payment_request_items;
DROP TRIGGER IF EXISTS trg_calculate_quote_balance ON public.quotes;

-- 0c. 砍 FK 等改完一起重建
ALTER TABLE public.payment_request_items
  DROP CONSTRAINT IF EXISTS payment_request_items_request_id_fkey;

-- ----------------------------------------------------------------------------
-- 1. (10, 2) → (20, 2)：30 個欄位
-- ----------------------------------------------------------------------------
ALTER TABLE public.checks ALTER COLUMN amount TYPE numeric(20, 2);

ALTER TABLE public.cost_templates ALTER COLUMN cost_price TYPE numeric(20, 2);
ALTER TABLE public.cost_templates ALTER COLUMN selling_price TYPE numeric(20, 2);

ALTER TABLE public.customers ALTER COLUMN total_spent TYPE numeric(20, 2);

ALTER TABLE public.disbursement_orders ALTER COLUMN amount TYPE numeric(20, 2);

ALTER TABLE public.linkpay_logs ALTER COLUMN price TYPE numeric(20, 2);

ALTER TABLE public.order_members ALTER COLUMN balance_amount TYPE numeric(20, 2);
ALTER TABLE public.order_members ALTER COLUMN cost_price TYPE numeric(20, 2);
ALTER TABLE public.order_members ALTER COLUMN deposit_amount TYPE numeric(20, 2);
ALTER TABLE public.order_members ALTER COLUMN flight_cost TYPE numeric(20, 2);
ALTER TABLE public.order_members ALTER COLUMN misc_cost TYPE numeric(20, 2);
ALTER TABLE public.order_members ALTER COLUMN selling_price TYPE numeric(20, 2);
ALTER TABLE public.order_members ALTER COLUMN total_payable TYPE numeric(20, 2);
ALTER TABLE public.order_members ALTER COLUMN transport_cost TYPE numeric(20, 2);

ALTER TABLE public.orders ALTER COLUMN paid_amount TYPE numeric(20, 2);
ALTER TABLE public.orders ALTER COLUMN remaining_amount TYPE numeric(20, 2);
ALTER TABLE public.orders ALTER COLUMN total_amount TYPE numeric(20, 2);

ALTER TABLE public.payment_request_items ALTER COLUMN subtotal TYPE numeric(20, 2);
ALTER TABLE public.payment_request_items ALTER COLUMN unitprice TYPE numeric(20, 2);

ALTER TABLE public.quotes ALTER COLUMN total_amount TYPE numeric(20, 2);

ALTER TABLE public.receipts ALTER COLUMN actual_amount TYPE numeric(20, 2);
ALTER TABLE public.receipts ALTER COLUMN fees TYPE numeric(20, 2);
ALTER TABLE public.receipts ALTER COLUMN receipt_amount TYPE numeric(20, 2);

ALTER TABLE public.suppliers ALTER COLUMN total_spent TYPE numeric(20, 2);

ALTER TABLE public.tours ALTER COLUMN price TYPE numeric(20, 2);
ALTER TABLE public.tours ALTER COLUMN total_cost TYPE numeric(20, 2);
ALTER TABLE public.tours ALTER COLUMN total_revenue TYPE numeric(20, 2);

ALTER TABLE public.visas ALTER COLUMN cost TYPE numeric(20, 2);
ALTER TABLE public.visas ALTER COLUMN fee TYPE numeric(20, 2);

-- ----------------------------------------------------------------------------
-- 2. (12, 2) → (20, 2)：9 個欄位
-- ----------------------------------------------------------------------------
ALTER TABLE public.payment_requests ALTER COLUMN amount TYPE numeric(20, 2);
ALTER TABLE public.payment_requests ALTER COLUMN total_amount TYPE numeric(20, 2);

ALTER TABLE public.quotes ALTER COLUMN balance_amount TYPE numeric(20, 2);
ALTER TABLE public.quotes ALTER COLUMN received_amount TYPE numeric(20, 2);
ALTER TABLE public.quotes ALTER COLUMN total_cost TYPE numeric(20, 2);

ALTER TABLE public.request_response_items ALTER COLUMN unit_price TYPE numeric(20, 2);
ALTER TABLE public.request_responses ALTER COLUMN total_amount TYPE numeric(20, 2);

ALTER TABLE public.travel_invoices ALTER COLUMN allowance_amount TYPE numeric(20, 2);
ALTER TABLE public.travel_invoices ALTER COLUMN total_amount TYPE numeric(20, 2);

-- ----------------------------------------------------------------------------
-- 3. (15, 2) → (20, 2)：10 個欄位
-- ----------------------------------------------------------------------------
ALTER TABLE public.accounting_accounts ALTER COLUMN balance TYPE numeric(20, 2);

ALTER TABLE public.accounting_transactions ALTER COLUMN amount TYPE numeric(20, 2);

ALTER TABLE public.journal_lines ALTER COLUMN credit_amount TYPE numeric(20, 2);
ALTER TABLE public.journal_lines ALTER COLUMN debit_amount TYPE numeric(20, 2);

ALTER TABLE public.journal_vouchers ALTER COLUMN total_credit TYPE numeric(20, 2);
ALTER TABLE public.journal_vouchers ALTER COLUMN total_debit TYPE numeric(20, 2);

ALTER TABLE public.transportation_rates ALTER COLUMN cost_vnd TYPE numeric(20, 2);
ALTER TABLE public.transportation_rates ALTER COLUMN kkday_cost TYPE numeric(20, 2);
ALTER TABLE public.transportation_rates ALTER COLUMN kkday_selling_price TYPE numeric(20, 2);
ALTER TABLE public.transportation_rates ALTER COLUMN price TYPE numeric(20, 2);
ALTER TABLE public.transportation_rates ALTER COLUMN price_twd TYPE numeric(20, 2);

-- ----------------------------------------------------------------------------
-- 4. 重建依賴物件
-- ----------------------------------------------------------------------------

-- 4a. view
CREATE VIEW public.orders_invoice_summary AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.contact_person,
  o.tour_id,
  o.workspace_id,
  o.total_amount,
  COALESCE(o.paid_amount, 0::numeric) AS paid_amount,
  get_order_invoiced_amount(o.id) AS invoiced_amount,
  get_order_invoiceable_amount(o.id) AS invoiceable_amount
FROM public.orders o;

COMMENT ON VIEW public.orders_invoice_summary IS '訂單發票摘要：含已開立/可開立金額。隨 orders 金額欄位升至 numeric(20,2) 一併重建。';

-- 4b. trigger（規格不變、只是重建）
CREATE TRIGGER trigger_update_payment_request_total_on_update
  AFTER UPDATE OF subtotal ON public.payment_request_items
  FOR EACH ROW EXECUTE FUNCTION update_payment_request_total();

CREATE TRIGGER trg_calculate_quote_balance
  BEFORE INSERT OR UPDATE OF total_amount, received_amount ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION calculate_quote_balance();

-- 4c. FK 重建、改成 CASCADE（讓 deletePaymentRequest 在 service rollback 時能成功）
ALTER TABLE public.payment_request_items
  ADD CONSTRAINT payment_request_items_request_id_fkey
  FOREIGN KEY (request_id) REFERENCES public.payment_requests(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 5. 標記決策（避免未來有人想加欄位時又選錯精度）
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN public.payment_request_items.unitprice IS '單價（NT$）。SaaS 統一金額精度 numeric(20,2)、不要再分歧。';
COMMENT ON COLUMN public.payment_request_items.subtotal IS '小計（unitprice × quantity）。SaaS 統一金額精度 numeric(20,2)。';
COMMENT ON COLUMN public.payment_requests.total_amount IS '請款總額。SaaS 統一金額精度 numeric(20,2)。';
COMMENT ON COLUMN public.receipts.receipt_amount IS '收款金額。SaaS 統一金額精度 numeric(20,2)。';
COMMENT ON COLUMN public.orders.total_amount IS '訂單總額。SaaS 統一金額精度 numeric(20,2)。';

COMMIT;
