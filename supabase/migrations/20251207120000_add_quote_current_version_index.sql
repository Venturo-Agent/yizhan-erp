-- 報價單版本結構優化：新增 current_version_index 欄位
-- 用於追蹤當前正在編輯的版本索引

BEGIN;

-- 新增 current_version_index 欄位
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS current_version_index integer DEFAULT 0;

COMMENT ON COLUMN public.quotes.current_version_index IS '當前編輯的版本索引（對應 versions JSONB 陣列的 index）';

COMMIT;
