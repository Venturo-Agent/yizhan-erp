-- ═══════════════════════════════════════════════════════════════════════════
-- 新模組 feature 種子資料
--
-- 新增 travel_invoice（premium）和 esim（basic）兩個 feature code 到所有
-- 現有 workspace 的 workspace_features，預設 enabled = false。
--
-- 策略：INSERT ... ON CONFLICT DO NOTHING
--   → idempotent、重跑不重複插、已手動開通的 workspace 不會被蓋掉
--
-- 注意：esims 之前在 20260423140000_clean_dead_workspace_features.sql 被砍過，
--       這次以 esim（新 code）重建，不影響舊 esims。
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- travel_invoice（premium）— 預設 false、需 workspace admin 手動開啟
INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
SELECT
  w.id,
  'travel_invoice',
  false
FROM public.workspaces w
ON CONFLICT DO NOTHING;

-- esim（basic）— 預設 false、需 workspace admin 手動開啟
INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
SELECT
  w.id,
  'esim',
  false
FROM public.workspaces w
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_travel_count int;
  v_esim_count   int;
BEGIN
  SELECT count(*) INTO v_travel_count
    FROM public.workspace_features WHERE feature_code = 'travel_invoice';
  SELECT count(*) INTO v_esim_count
    FROM public.workspace_features WHERE feature_code = 'esim';

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '新模組 feature seed 完成';
  RAISE NOTICE '  travel_invoice (premium, enabled=false): % workspaces', v_travel_count;
  RAISE NOTICE '  esim           (basic,   enabled=false): % workspaces', v_esim_count;
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- Rollback:
-- DELETE FROM public.workspace_features WHERE feature_code IN ('travel_invoice', 'esim');
