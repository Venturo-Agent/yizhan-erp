-- Add batch_id column to payment_requests for grouping batch-created requests
BEGIN;

-- 新增 batch_id 欄位：同一批建立的請款單共用同一個 batch_id
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS batch_id uuid;

-- 建立索引加速批次查詢
CREATE INDEX IF NOT EXISTS idx_payment_requests_batch_id
ON public.payment_requests(batch_id)
WHERE batch_id IS NOT NULL;

COMMENT ON COLUMN public.payment_requests.batch_id IS '批次 ID：同一批建立的請款單共用此 ID，null 表示單獨建立';

COMMIT;
