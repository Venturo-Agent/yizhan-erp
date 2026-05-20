-- ════════════════════════════════════════════════════════════════════════════
-- Migration: marketing 模組 seed（feature + capabilities + Corner workspace 開通）
-- 2026-05-20  William 拍板（corner-website ERP 整合 spec v1 線 B）
--
-- 背景：
--   Corner Travel 官網（corner.venturo.tw）走「ERP SSOT、官網櫥窗」模式、
--   業務在 /marketing/website 管團上架。需要 5 SSOT 的第 5 個 SSOT：
--   workspace_features + role_capabilities 開通。
--
-- 5 SSOTs 進度：
--   1. ✅ 路由：src/app/(main)/marketing/website/{page.tsx,[code]/page.tsx}（本次 commit 加）
--   2. ✅ capabilities.ts：codegen 衍生（marketing.website.{read,write}）
--   3. ✅ module-tabs.ts：codegen 衍生（行銷管理 → 官網管理）
--   4. ✅ features.ts：codegen 衍生（marketing basic + routes）
--   5. ✅ seed migration：本檔 — DB workspace_features + role_capabilities
--
-- 動作：
--   A. workspace_features.marketing：所有 workspace 預設 false（不影響既有客戶）
--      Corner workspace（CORNER）特別開 true（背景：本來就是為 Corner 做的）
--   B. role_capabilities：給每 workspace 的 is_admin=true role 預設開 marketing.website.{read,write}
--
-- 紅線對齊：
--   - 紅線 #0：本檔不寫 platform.is_admin 後門、只用 workspace_features + role_capabilities
--   - 紅線 E：純 seed、無 trigger、無 API 雙寫風險
--   - 紅線 D：無「解鎖 / reopen」邏輯
--   - ON CONFLICT DO NOTHING / DO UPDATE 確保 idempotent、可重跑
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────── Block A: workspace_features ─────────
-- A1. 所有 workspace 都加 marketing feature row、預設 false（admin 自己決定要不要開）
INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
SELECT id, 'marketing', false
FROM public.workspaces
ON CONFLICT (workspace_id, feature_code) DO NOTHING;

-- A2. Corner workspace 特別開 true（本來就為 Corner 做的）
UPDATE public.workspace_features
SET enabled = true,
    enabled_at = COALESCE(enabled_at, now())
WHERE feature_code = 'marketing'
  AND workspace_id = (SELECT id FROM public.workspaces WHERE code = 'CORNER');


-- ───────── Block B: role_capabilities ─────────
-- 給每 workspace 的 is_admin role 預設開 marketing.website.{read,write}
-- 用 ON CONFLICT DO UPDATE SET enabled = EXCLUDED.enabled（跟 visas seed 同 pattern）
-- 這樣若 admin 自己手動關過再 re-seed、會被強制再開（保持「admin 預設全開」紀律）
INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT wr.id, cap.code, true
FROM public.workspace_roles wr
CROSS JOIN (VALUES
  ('marketing.website.read'),
  ('marketing.website.write')
) AS cap(code)
WHERE wr.is_admin = true
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = EXCLUDED.enabled;


-- ───────── Block C: 驗證 ─────────
DO $$
DECLARE
  v_workspace_count  int;
  v_feature_count    int;
  v_corner_enabled   boolean;
  v_admin_role_count int;
  v_cap_count        int;
BEGIN
  SELECT count(*) INTO v_workspace_count FROM public.workspaces;
  SELECT count(*) INTO v_feature_count
    FROM public.workspace_features WHERE feature_code = 'marketing';
  SELECT enabled INTO v_corner_enabled
    FROM public.workspace_features
    WHERE feature_code = 'marketing'
      AND workspace_id = (SELECT id FROM public.workspaces WHERE code = 'CORNER');
  SELECT count(*) INTO v_admin_role_count
    FROM public.workspace_roles WHERE is_admin = true;
  SELECT count(*) INTO v_cap_count
    FROM public.role_capabilities
    WHERE capability_code LIKE 'marketing.%' AND enabled = true;

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE 'marketing 模組 seed 完成：';
  RAISE NOTICE '  Workspaces: %', v_workspace_count;
  RAISE NOTICE '  workspace_features.marketing rows: % (應 = workspaces 數)', v_feature_count;
  RAISE NOTICE '  Corner workspace enabled: % (應 = true)', v_corner_enabled;
  RAISE NOTICE '  is_admin roles: %', v_admin_role_count;
  RAISE NOTICE '  role_capabilities marketing.*: % (應 = is_admin roles × 2)', v_cap_count;
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DELETE FROM public.role_capabilities WHERE capability_code LIKE 'marketing.%';
-- DELETE FROM public.workspace_features WHERE feature_code = 'marketing';
-- COMMIT;
