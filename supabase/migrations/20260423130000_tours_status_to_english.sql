-- ============================================================================
-- tours.status 中文 → 英文統一
-- ============================================================================
--
-- 背景：
--   tours.status 欄位過去存中文（開團 / 待出發 / 已結團 / 取消）、
--   又有兩套 code 內部英文列舉（tour.service.ts 7 值、useToursPaginated 5 值）、
--   實際 DB 同時存在中英混用的 6 種值（待出發/planning/提案/已完成/進行中/特殊團）。
--
-- 2026-04-23 William 訪談定案 6 狀態英文：
--   template / proposal / upcoming / ongoing / returned / closed
--
-- 此 migration：
-- 1. 把現有中文值翻譯成英文
-- 2. 加 CHECK constraint 擋未來亂塞
-- 3. tour_type = 'template' 的團 status 強制設 'template'（原本不一致）

-- 1. 現有中文值翻譯
UPDATE tours SET status = CASE
  WHEN status = '提案' THEN 'proposal'
  WHEN status = '待出發' THEN 'upcoming'
  WHEN status = '進行中' THEN 'ongoing'
  WHEN status = '已結團' THEN 'closed'
  WHEN status = '已完成' THEN 'returned'  -- 曾手動改「已完成」但未按結案、實際上是未結團
  WHEN status = '開團' THEN 'upcoming'    -- 舊值、理論上不應存在
  ELSE status
END
WHERE status IN ('提案', '待出發', '進行中', '已結團', '已完成', '開團');

-- 2. tour_type = 'template' 但 status 非 template 的團、強制修正
UPDATE tours SET status = 'template'
WHERE tour_type = 'template' AND (status IS NULL OR status != 'template');

-- 3. 加 CHECK constraint
--    注意：此 migration 跑時、舊值應該已全部翻譯完成
ALTER TABLE tours
  ADD CONSTRAINT tours_status_check
  CHECK (status IN ('template', 'proposal', 'upcoming', 'ongoing', 'returned', 'closed'));

-- 4. 設預設值為 proposal（從空白直接開新團時的起點）
ALTER TABLE tours ALTER COLUMN status SET DEFAULT 'proposal';
