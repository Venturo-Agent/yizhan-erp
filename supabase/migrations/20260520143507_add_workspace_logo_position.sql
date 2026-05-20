-- ════════════════════════════════════════════════════════
-- workspaces 表加 logo_scale + logo_offset_x
-- ════════════════════════════════════════════════════════
-- 為什麼:小旅行社沒美編、需要讓使用者自己微調 logo 在
-- PrintHeader 列印頁首裡的大小跟水平位置、設好後固定下來。
-- 一份設定、所有列印共用（報價單 / 請款單 / 出納單...）
--
-- 規格:
--   - logo_scale: 50% (0.5) - 200% (2.0)、以現行 120×40 為 100%
--   - logo_offset_x: 水平位移 px、Y 軸鎖頂部不動
--
-- 對齊紅線 A:沒動 RLS、workspaces 仍 NO FORCE
-- 對齊紅線 E:純 ADD COLUMN、無 trigger、無 INSERT 撞車
-- ════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS logo_scale numeric(4, 2) DEFAULT 1.0 NOT NULL,
  ADD COLUMN IF NOT EXISTS logo_offset_x integer DEFAULT 0 NOT NULL;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_logo_scale_range
    CHECK (logo_scale >= 0.5 AND logo_scale <= 2.0);

COMMENT ON COLUMN public.workspaces.logo_scale IS
  'Logo 在 PrintHeader 內的縮放比例(0.5-2.0、以 120×40 為 1.0)。';
COMMENT ON COLUMN public.workspaces.logo_offset_x IS
  'Logo 在 PrintHeader 內的水平位移(px、相對左邊界)。Y 軸鎖頂部不動。';

COMMIT;

-- ════ Rollback(萬一爆炸、複製貼上跑)════
-- BEGIN;
-- ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_logo_scale_range;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS logo_scale;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS logo_offset_x;
-- COMMIT;
