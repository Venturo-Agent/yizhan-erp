-- 代轉發票資料表
-- 用於儲存藍新旅行業代收轉付電子收據

BEGIN;

-- 建立 travel_invoices 表
CREATE TABLE IF NOT EXISTS public.travel_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 交易資訊
  transaction_no text NOT NULL UNIQUE,
  merchant_id text,
  invoice_number text,
  invoice_date date NOT NULL,

  -- 金額資訊
  total_amount numeric(12, 2) NOT NULL,
  tax_type text NOT NULL DEFAULT 'dutiable', -- dutiable, zero, free

  -- 買受人資訊
  buyer_name text NOT NULL,
  buyer_ubn text,
  buyer_email text,
  buyer_mobile text,
  buyer_info jsonb NOT NULL DEFAULT '{}',

  -- 商品明細
  items jsonb NOT NULL DEFAULT '[]',

  -- 狀態
  status text NOT NULL DEFAULT 'pending', -- pending, issued, voided, allowance, failed

  -- 發票資訊（開立成功後）
  random_num text,
  barcode text,
  qrcode_l text,
  qrcode_r text,

  -- 作廢資訊
  void_date timestamptz,
  void_reason text,
  voided_by uuid REFERENCES public.employees(id),

  -- 折讓資訊
  allowance_date timestamptz,
  allowance_amount numeric(12, 2),
  allowance_items jsonb,
  allowance_no text,
  allowanced_by uuid REFERENCES public.employees(id),

  -- 關聯（orders 和 tours 的 id 是 text 類型）
  order_id text REFERENCES public.orders(id),
  tour_id text REFERENCES public.tours(id),

  -- 審計欄位
  created_by uuid NOT NULL REFERENCES public.employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_travel_invoices_transaction_no ON public.travel_invoices(transaction_no);
CREATE INDEX IF NOT EXISTS idx_travel_invoices_invoice_number ON public.travel_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_travel_invoices_status ON public.travel_invoices(status);
CREATE INDEX IF NOT EXISTS idx_travel_invoices_invoice_date ON public.travel_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_travel_invoices_order_id ON public.travel_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_travel_invoices_tour_id ON public.travel_invoices(tour_id);
CREATE INDEX IF NOT EXISTS idx_travel_invoices_created_at ON public.travel_invoices(created_at DESC);

-- 註解
COMMENT ON TABLE public.travel_invoices IS '代轉發票（藍新旅行業電子收據）';
COMMENT ON COLUMN public.travel_invoices.transaction_no IS '交易編號';
COMMENT ON COLUMN public.travel_invoices.invoice_number IS '發票號碼';
COMMENT ON COLUMN public.travel_invoices.tax_type IS '課稅類別：dutiable=應稅, zero=零稅率, free=免稅';
COMMENT ON COLUMN public.travel_invoices.status IS '狀態：pending=待處理, issued=已開立, voided=已作廢, allowance=已折讓, failed=失敗';

-- RLS 設定（內部管理系統，禁用 RLS）
ALTER TABLE public.travel_invoices DISABLE ROW LEVEL SECURITY;

COMMIT;
