-- 建立請款項目表
BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT, -- 對應 payment_requests.id
  description TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'TWD',
  supplier_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  _needs_sync BOOLEAN DEFAULT FALSE,
  _synced_at TIMESTAMPTZ,
  _deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_payment_request_items_request_id ON public.payment_request_items(request_id);
ALTER TABLE public.payment_request_items DISABLE ROW LEVEL SECURITY;

COMMIT;
