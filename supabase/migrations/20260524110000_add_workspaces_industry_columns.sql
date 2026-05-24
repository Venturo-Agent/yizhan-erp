-- ================================================================
-- 新增產業分類欄位（2026-05-24 William 拍板）
--
-- 欄位：
--   industry       — 產業大類：tourism | general | NULL（預設）
--   sub_industry   — 觀光產業細分：travel_agency | tour_bus | local_agency | NULL
--
-- 說明：
--   - tourism → sub_industry 必填（需細分）
--   - general → sub_industry 留 NULL（目前只有 AI 客服）
--   - 新增租戶 API 尚未串接、舊有記錄先補 NULL，後續以 UPDATE 補標記
-- ================================================================

BEGIN;

ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sub_industry TEXT DEFAULT NULL;

-- 註解（文件化）
COMMENT ON COLUMN public.workspaces.industry IS '產業分類：tourism | general | NULL';
COMMENT ON COLUMN public.workspaces.sub_industry IS '觀光細分行業：travel_agency | tour_bus | local_agency | NULL（只有 industry=tourism 時有意義）';

COMMIT;