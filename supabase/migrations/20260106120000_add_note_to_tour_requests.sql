-- 為 tour_requests 加入 note 欄位
-- 用於存放備註資訊（如：交通的航班資訊）

BEGIN;

-- 1. 加入 note 欄位
ALTER TABLE public.tour_requests
ADD COLUMN IF NOT EXISTS note text;

-- 2. 加入註解
COMMENT ON COLUMN public.tour_requests.note IS '備註（交通用於存放航班資訊）';

COMMIT;
