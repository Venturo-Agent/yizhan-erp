-- 修復 payment_request_items 表格欄位
BEGIN;

-- 新增缺失的欄位
ALTER TABLE public.payment_request_items
ADD COLUMN IF NOT EXISTS item_number TEXT,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier_name TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS workspace_id UUID,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 重新命名 notes 為 note (與型別定義一致)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_request_items' AND column_name = 'notes') THEN
    ALTER TABLE public.payment_request_items RENAME COLUMN notes TO note;
  END IF;
END $$;

-- 更新 category 的類型約束（選填）
COMMENT ON COLUMN public.payment_request_items.category IS '類別: 住宿, 交通, 餐食, 門票, 導遊, 其他';

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_payment_request_items_workspace_id ON public.payment_request_items(workspace_id);

COMMIT;
