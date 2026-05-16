-- 新增 itineraries 封存功能
-- 日期: 2025-12-05
-- 目的: 避免誤刪，將刪除改為封存

BEGIN;

-- 新增 archived_at 欄位
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_itineraries_archived_at ON itineraries(archived_at);

-- 新增註解
COMMENT ON COLUMN public.itineraries.archived_at IS '封存時間，null 表示未封存';

COMMIT;
