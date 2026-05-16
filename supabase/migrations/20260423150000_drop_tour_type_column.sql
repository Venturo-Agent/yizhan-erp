-- ============================================================================
-- 砍 tours.tour_type 欄位（併入 status）
-- ============================================================================
--
-- 背景：
--   tour_type (official/proposal/template) 和 status 雙軌並存、造成 SSOT 破碎。
--   提案/模板的「類型」本質上就是「生命週期階段」、應該併入 status。
--
-- 2026-04-23 code 已全部改成讀寫 status、不再用 tour_type。

-- 1. 修正 tour_type=proposal 但 status 非 proposal 的歷史資料（舊 useToursForm bug 造成）
UPDATE tours SET status = 'proposal'
WHERE tour_type = 'proposal' AND status != 'proposal';

-- 2. 同步 tour_type=template 的 status
UPDATE tours SET status = 'template'
WHERE tour_type = 'template' AND status != 'template';

-- 3. DROP 欄位
ALTER TABLE tours DROP COLUMN IF EXISTS tour_type;
