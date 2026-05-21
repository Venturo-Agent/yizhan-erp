-- ════════════════════════════════════════════════════════
-- workspaces 加 logo_offset_y + 放寬 logo_scale 範圍
-- ════════════════════════════════════════════════════════
-- 為什麼:
--   1. 50%-200% 不夠用、有些旅行社 logo 設計差距大、需要 25%-300%
--   2. 之前 Y 軸鎖頂、但 user 反映「放大時 logo 會偏移」、
--      需要上下微調回到正確位置(不只左右)
-- ════════════════════════════════════════════════════════

BEGIN;

-- 1. 放寬 logo_scale CHECK 範圍從 0.5-2.0 到 0.25-3.0
ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_logo_scale_range;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_logo_scale_range
    CHECK (logo_scale >= 0.25 AND logo_scale <= 3.0);

-- 2. 加 logo_offset_y(垂直位移、跟 offset_x 同 unit、可正負)
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS logo_offset_y integer DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.workspaces.logo_offset_y IS
  'Logo 在 PrintHeader 內的垂直位移(px、相對 top 0)。';
COMMENT ON COLUMN public.workspaces.logo_scale IS
  'Logo 在 PrintHeader 內的縮放比例(0.25-3.0、以 120×40 為 1.0)。';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS logo_offset_y;
-- ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_logo_scale_range;
-- ALTER TABLE public.workspaces
--   ADD CONSTRAINT workspaces_logo_scale_range
--     CHECK (logo_scale >= 0.5 AND logo_scale <= 2.0);
-- COMMIT;
