-- =============================================
-- Migration: 建立 invoice_orders 表（發票-訂單多對多關聯）
-- 日期: 2026-01-26
-- 目的: 支援多訂單合併開立一張發票
-- =============================================

-- 1. 為 travel_invoices 新增欄位
ALTER TABLE public.travel_invoices
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id),
ADD COLUMN IF NOT EXISTS is_batch BOOLEAN DEFAULT false;

-- 更新現有資料的 workspace_id（從關聯的 tour 取得）
UPDATE public.travel_invoices ti
SET workspace_id = t.workspace_id
FROM public.tours t
WHERE ti.tour_id = t.id
AND ti.workspace_id IS NULL;

-- 如果還有沒設定的，從 order 取得
UPDATE public.travel_invoices ti
SET workspace_id = o.workspace_id
FROM public.orders o
WHERE ti.order_id = o.id
AND ti.workspace_id IS NULL;

-- 2. 建立 invoice_orders 表（發票-訂單多對多關聯）
CREATE TABLE IF NOT EXISTS public.invoice_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.travel_invoices(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL,  -- 該訂單分攤金額

  -- 標準欄位
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,

  -- 確保同一張發票不會重複關聯同一訂單
  CONSTRAINT invoice_orders_unique UNIQUE (invoice_id, order_id)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_invoice_orders_invoice_id ON public.invoice_orders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_orders_order_id ON public.invoice_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_orders_workspace_id ON public.invoice_orders(workspace_id);

-- 3. 遷移現有資料：將 travel_invoices.order_id 的關聯搬到 invoice_orders
INSERT INTO public.invoice_orders (invoice_id, order_id, amount, workspace_id, created_by)
SELECT
  ti.id,
  ti.order_id,
  ti.total_amount,
  COALESCE(ti.workspace_id, o.workspace_id),
  ti.created_by
FROM public.travel_invoices ti
JOIN public.orders o ON o.id = ti.order_id
WHERE ti.order_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.invoice_orders io
  WHERE io.invoice_id = ti.id AND io.order_id = ti.order_id
);

-- 4. 建立計算已開發票金額的函數
CREATE OR REPLACE FUNCTION public.get_order_invoiced_amount(p_order_id TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT SUM(io.amount)
      FROM public.invoice_orders io
      JOIN public.travel_invoices ti ON ti.id = io.invoice_id
      WHERE io.order_id = p_order_id
      AND ti.status NOT IN ('voided', 'failed')
    ),
    0
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. 建立取得可開發票金額的函數
CREATE OR REPLACE FUNCTION public.get_order_invoiceable_amount(p_order_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_paid_amount NUMERIC;
  v_invoiced_amount NUMERIC;
BEGIN
  SELECT COALESCE(paid_amount, 0) INTO v_paid_amount
  FROM public.orders
  WHERE id = p_order_id;

  v_invoiced_amount := public.get_order_invoiced_amount(p_order_id);

  RETURN GREATEST(v_paid_amount - v_invoiced_amount, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. 建立 View 方便查詢訂單的發票資訊
CREATE OR REPLACE VIEW public.orders_invoice_summary AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.contact_person,
  o.tour_id,
  o.workspace_id,
  o.total_amount,
  COALESCE(o.paid_amount, 0) AS paid_amount,
  public.get_order_invoiced_amount(o.id) AS invoiced_amount,
  public.get_order_invoiceable_amount(o.id) AS invoiceable_amount
FROM public.orders o;

-- 7. RLS 設定（與其他表一致，單租戶模式禁用 RLS）
ALTER TABLE public.invoice_orders DISABLE ROW LEVEL SECURITY;

-- 8. 註解
COMMENT ON TABLE public.invoice_orders IS '發票-訂單關聯表（多對多），支援多訂單合併開立一張發票';
COMMENT ON COLUMN public.invoice_orders.amount IS '該訂單在此發票中分攤的金額';
COMMENT ON COLUMN public.travel_invoices.is_batch IS '是否為批次開立的發票';
COMMENT ON FUNCTION public.get_order_invoiced_amount IS '計算訂單已開發票總金額（排除作廢和失敗的發票）';
COMMENT ON FUNCTION public.get_order_invoiceable_amount IS '計算訂單可開發票金額 = 已收款 - 已開發票';
COMMENT ON VIEW public.orders_invoice_summary IS '訂單發票資訊摘要，包含已收款、已開發票、可開金額';
