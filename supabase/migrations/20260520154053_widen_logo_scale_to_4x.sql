-- ════════════════════════════════════════════════════════
-- workspaces.logo_scale 上限從 3.0 拉到 4.0
-- ════════════════════════════════════════════════════════
-- 為什麼:user 反映 300% 仍不夠大、有的旅行社 logo 設計
-- 比例特殊、需要更大的縮放空間。
-- ════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_logo_scale_range;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_logo_scale_range
    CHECK (logo_scale >= 0.25 AND logo_scale <= 4.0);

COMMENT ON COLUMN public.workspaces.logo_scale IS
  'Logo 在 PrintHeader 內的縮放比例(0.25-4.0、以 120×40 為 1.0)。';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_logo_scale_range;
-- ALTER TABLE public.workspaces
--   ADD CONSTRAINT workspaces_logo_scale_range
--     CHECK (logo_scale >= 0.25 AND logo_scale <= 3.0);
-- COMMIT;
