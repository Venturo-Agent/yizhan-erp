-- ─────────────────────────────────────────────────────────────────────────────
-- itineraries.status: 中文 enum → 英文 enum（5/13 William 拍板）
--
-- 緣起：itineraries.status CHECK = ('草稿' / '已發布')、跟整體系統英文 enum 不一致
-- 紀律：DB code 用英文 enum、中文只在 UI label 顯示
--
-- 對應 tours.status = ('proposal' / 'active' / 'closed' / ...) 英文
-- 對應 orders.status / payment_requests.status 等都是英文
--
-- backfill 現有資料（5/13 production snapshot）：
--   '草稿' × 3 → 'draft'
--   '已發布' × 16 → 'published'
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. 先 drop 舊 constraint（不然 UPDATE 會被擋）
ALTER TABLE public.itineraries DROP CONSTRAINT IF EXISTS itineraries_status_check;

-- 2. backfill：中文 → 英文
UPDATE public.itineraries SET status = 'draft' WHERE status = '草稿';
UPDATE public.itineraries SET status = 'published' WHERE status = '已發布';

-- 3. add 新 CHECK constraint（英文）
ALTER TABLE public.itineraries
  ADD CONSTRAINT itineraries_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'published'::text]));

-- 4. 驗證
DO $$
DECLARE
  v_invalid INT;
BEGIN
  SELECT count(*) INTO v_invalid
    FROM public.itineraries
    WHERE status NOT IN ('draft', 'published');

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ itineraries.status 改英文 enum 完成';
  RAISE NOTICE '  剩餘不合法 status row 數：% （expected 0）', v_invalid;
  RAISE NOTICE '════════════════════════════════════════════════════════════';

  IF v_invalid > 0 THEN
    RAISE EXCEPTION 'backfill 漏 row、有 % row 仍非 draft/published', v_invalid;
  END IF;
END $$;

COMMIT;
