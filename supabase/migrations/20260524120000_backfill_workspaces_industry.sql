-- ================================================================
-- 補標記現有 workspace 產業分類（2026-05-24 William 拍板）
--
-- 根據 William 確認的清單：
--   - VENTURO（漫途）→ 一般產業（平台方）
--   - CORNER / YOUNGCHEN / UTOUR / YUFENG → 觀光產業 / 旅行社
--   - STANDARD / LITE / PREMIUM / ADVANCE → 觀光產業 / 旅行社（預設）
-- ================================================================

BEGIN;

-- VENTURO：平台方 → 一般產業
UPDATE public.workspaces
SET industry = 'general', sub_industry = NULL
WHERE code = 'VENTURO';

-- 旅行社（tourism / travel_agency）
UPDATE public.workspaces
SET industry = 'tourism', sub_industry = 'travel_agency'
WHERE code IN ('CORNER', 'YOUNGCHEN', 'UTOUR', 'YUFENG',
               'STANDARD', 'LITE', 'PREMIUM', 'ADVANCE');

COMMIT;