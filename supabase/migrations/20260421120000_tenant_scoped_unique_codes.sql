-- 多租戶編號約束改為 tenant-scoped UNIQUE
--
-- Why:
-- 原設計 13 張多租戶表的編號欄位（code / order_number / record_locator 等）是全域
-- UNIQUE、不含 workspace_id。新租戶試建第一筆時、客戶端 SELECT 被 RLS 擋回 0 筆、
-- client 算出 nextNum=1 生 `-001`、INSERT 撞到其他租戶今天的 `-001` → 23505 炸。
-- 修 client retry 沒用（每次算出同編號）、根本解是把 UNIQUE 改成
-- UNIQUE(workspace_id, <col>)、每家租戶各自的編號空間。
--
-- 同時：另有 3 張 workspace_id 可為 NULL 但目前 0 筆 NULL row 的表、順手加 NOT NULL
-- 防未來新 row 繞過 tenant-scoped unique。
--
-- Pre-flight (2026-04-21) 確認：
-- * 0 筆 workspace_id IS NULL（13 張全部）
-- * 0 組現有 (workspace_id, col) 重複（不會擋 constraint）
-- * 僅 linkpay_logs.receipt_number 有 FK → receipts.receipt_number、但 linkpay_logs
--   目前 0 筆、降級風險最小
--
-- 🚨 tours.code / tour_requests.code / contracts.code 本次 **不改**，因為被公開 URL
-- （保險公司短網址、客戶合約簽署、提案追蹤頁）當全域 key 查詢、需先決 URL 設計。

BEGIN;

-- ===================================================================
-- 1. workspace_id 補 NOT NULL（3 張 nullable、但目前 0 筆 NULL）
-- ===================================================================
ALTER TABLE public.disbursement_orders ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.payment_requests ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.system_settings ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.travel_invoices ALTER COLUMN workspace_id SET NOT NULL;

-- ===================================================================
-- 2. receipts 特殊處理（有 FK 依賴）
--    linkpay_logs.receipt_number → receipts.receipt_number (0 筆 linkpay_logs)
-- ===================================================================
ALTER TABLE public.linkpay_logs DROP CONSTRAINT linkpay_logs_receipt_number_fkey;
ALTER TABLE public.receipts DROP CONSTRAINT receipts_receipt_number_key;
ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_workspace_receipt_number_key
  UNIQUE (workspace_id, receipt_number);
-- 重建 FK 為 composite、確保 linkpay 的 receipt_number 與同 workspace 下 receipts 對齊
ALTER TABLE public.linkpay_logs
  ADD CONSTRAINT linkpay_logs_workspace_receipt_number_fkey
  FOREIGN KEY (workspace_id, receipt_number)
  REFERENCES public.receipts (workspace_id, receipt_number)
  ON DELETE RESTRICT;

-- ===================================================================
-- 3. 其餘 12 張：drop 全域 UNIQUE、加 tenant-scoped UNIQUE
-- ===================================================================

-- 🔴 HIGH: 商業單據 code
ALTER TABLE public.contracts DROP CONSTRAINT contracts_code_key;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_workspace_code_key UNIQUE (workspace_id, code);

ALTER TABLE public.customers DROP CONSTRAINT customers_code_key;
ALTER TABLE public.customers ADD CONSTRAINT customers_workspace_code_key UNIQUE (workspace_id, code);

ALTER TABLE public.disbursement_orders DROP CONSTRAINT disbursement_orders_code_key;
ALTER TABLE public.disbursement_orders ADD CONSTRAINT disbursement_orders_workspace_code_key UNIQUE (workspace_id, code);

ALTER TABLE public.orders DROP CONSTRAINT orders_code_key;
ALTER TABLE public.orders ADD CONSTRAINT orders_workspace_code_key UNIQUE (workspace_id, code);

ALTER TABLE public.payment_requests DROP CONSTRAINT payment_requests_code_key;
ALTER TABLE public.payment_requests ADD CONSTRAINT payment_requests_workspace_code_key UNIQUE (workspace_id, code);

ALTER TABLE public.quotes DROP CONSTRAINT quotes_code_key;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_workspace_code_key UNIQUE (workspace_id, code);

ALTER TABLE public.suppliers DROP CONSTRAINT suppliers_code_key;
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_workspace_code_key UNIQUE (workspace_id, code);

-- 🟡 MEDIUM: 商業單據 *_number
ALTER TABLE public.payments DROP CONSTRAINT payments_paymentnumber_key;
ALTER TABLE public.payments ADD CONSTRAINT payments_workspace_payment_number_key UNIQUE (workspace_id, payment_number);

ALTER TABLE public.refunds DROP CONSTRAINT refunds_refund_number_key;
ALTER TABLE public.refunds ADD CONSTRAINT refunds_workspace_refund_number_key UNIQUE (workspace_id, refund_number);

ALTER TABLE public.linkpay_logs DROP CONSTRAINT linkpay_logs_linkpay_order_number_key;
ALTER TABLE public.linkpay_logs ADD CONSTRAINT linkpay_logs_workspace_linkpay_order_number_key UNIQUE (workspace_id, linkpay_order_number);

-- 🟢 新增 3 張（業務上確認該租戶獨立）
ALTER TABLE public.system_settings DROP CONSTRAINT unique_category;
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_workspace_category_key UNIQUE (workspace_id, category);

ALTER TABLE public.pnrs DROP CONSTRAINT pnrs_record_locator_key;
ALTER TABLE public.pnrs ADD CONSTRAINT pnrs_workspace_record_locator_key UNIQUE (workspace_id, record_locator);

ALTER TABLE public.travel_invoices DROP CONSTRAINT travel_invoices_transaction_no_key;
ALTER TABLE public.travel_invoices ADD CONSTRAINT travel_invoices_workspace_transaction_no_key UNIQUE (workspace_id, transaction_no);

COMMIT;
