-- ════════════════════════════════════════════════════════════════
-- 為 workspaces 加產業分類欄位（industry / sub_industry）
-- 為什麼：ERP 要支援多產業（不只旅行社）、需在 workspace 層標記產業別、
--         讓後續功能可依產業顯示/隱藏。VENTURO（漫途整合行銷）= 一般業；
--         其餘 8 個租戶 = 觀光業/旅行社。
-- 來源：OpenCloud 規劃、2026-05-24 William 指示由 Claude 經 MCP apply。
-- 狀態：已於 2026-05-24 經 MCP apply_migration apply 到 production（aawrgygqgemgqssflfrx）。
-- ════════════════════════════════════════════════════════════════
BEGIN;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sub_industry TEXT DEFAULT NULL;

COMMENT ON COLUMN public.workspaces.industry IS '產業分類：tourism | general | NULL';
COMMENT ON COLUMN public.workspaces.sub_industry IS '觀光細分行業：travel_agency | tour_bus | local_agency | NULL';

UPDATE public.workspaces SET industry = 'general', sub_industry = NULL WHERE code = 'VENTURO';

UPDATE public.workspaces SET industry = 'tourism', sub_industry = 'travel_agency'
WHERE code IN ('CORNER', 'YOUNGCHEN', 'UTOUR', 'YUFENG', 'STANDARD', 'LITE', 'PREMIUM', 'ADVANCE');

COMMIT;

-- ════ Rollback（萬一要還原、複製貼上跑）════
-- BEGIN;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS industry;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS sub_industry;
-- COMMIT;
