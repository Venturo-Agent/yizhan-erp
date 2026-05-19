-- ════════════════════════════════════════════════════════════════════
-- visas 模組 seed：feature + capabilities + 字典預設值
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼建：
--   5/7 砍掉的 visas feature + capabilities 重新建。同時對所有既有 workspace
--   開通、給 is_admin role 預設所有 visas capabilities、種兩個字典的預設條目。
--
-- 5 SSOTs（CLAUDE.md L1-L6）：
--   1. routes：由 src/modules/visas.ts 宣告
--   2. capabilities.ts：由 codegen 衍生（本檔不動 code）
--   3. module-tabs.ts：同上、codegen 衍生
--   4. features.ts：同上、codegen 衍生
--   5. seed migration：本檔 — DB 層的 workspace_features + role_capabilities + 字典
--
-- 動作：
--   A. workspace_features.visas 對所有現有 workspace 預設啟用
--   B. role_capabilities 給 is_admin=true 的 role 開所有 visas.*.{read,write}
--   C. document_types 種子（每個 workspace）
--   D. application_service_types 種子（每個 workspace、跟 document_types join）
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- A. workspace_features 開啟 visas
-- ════════════════════════════════════════════════════════════════════

INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
SELECT id, 'visas', true
FROM public.workspaces
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = EXCLUDED.enabled;

-- ════════════════════════════════════════════════════════════════════
-- B. role_capabilities 給 is_admin 預設開所有 visas capabilities
-- ════════════════════════════════════════════════════════════════════

INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT wr.id, cap.code, true
FROM public.workspace_roles wr
CROSS JOIN (VALUES
  ('visas.applications.read'),
  ('visas.applications.write'),
  ('visas.documents.read'),
  ('visas.documents.write'),
  ('visas.document_types.read'),
  ('visas.document_types.write'),
  ('visas.service_types.read'),
  ('visas.service_types.write'),
  ('visas.pricing.read'),
  ('visas.pricing.write')
) AS cap(code)
WHERE wr.is_admin = true
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = EXCLUDED.enabled;

-- ════════════════════════════════════════════════════════════════════
-- C. document_types 預設字典
-- ════════════════════════════════════════════════════════════════════

INSERT INTO public.document_types
  (workspace_id, code, label, group_label, sort_order)
SELECT
  w.id,
  dt.code,
  dt.label,
  dt.group_label,
  dt.sort_order
FROM public.workspaces w
CROSS JOIN (VALUES
  -- 護照（issuing country 分）
  ('passport_tw',   '護照 台灣',  '護照', 10),
  ('passport_us',   '護照 美國',  '護照', 20),
  ('passport_jp',   '護照 日本',  '護照', 30),
  -- 港澳台
  ('taiwan_pass',   '台胞證',     '港澳台', 100),
  ('hk_macau_pass', '港澳通行證', '港澳台', 110),
  -- 美洲簽證
  ('visa_us',       '美簽',       '美洲簽證', 200),
  -- 亞洲簽證
  ('visa_jp',       '日簽',       '亞洲簽證', 300),
  ('visa_kr',       '韓簽',       '亞洲簽證', 310),
  ('visa_vn',       '越簽',       '亞洲簽證', 320),
  ('visa_th',       '泰簽',       '亞洲簽證', 330),
  -- 歐洲 / 大洋洲
  ('visa_schengen', '申根簽',     '歐洲簽證', 400),
  ('visa_uk',       '英簽',       '歐洲簽證', 410),
  ('visa_au',       '澳簽',       '大洋洲簽證', 500),
  ('visa_nz',       '紐簽',       '大洋洲簽證', 510)
) AS dt(code, label, group_label, sort_order)
ON CONFLICT (workspace_id, code) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
-- D. application_service_types 預設字典（含急件版本）
-- ════════════════════════════════════════════════════════════════════
--
-- 規則：護照辦理我們通常不代辦（客戶自己跑外交部）、所以不開護照的 service。
--      其他簽證每個都開「一般 / 急件」雙版本。
-- ════════════════════════════════════════════════════════════════════

INSERT INTO public.application_service_types
  (workspace_id, document_type_id, code, label, is_urgent, estimated_business_days, sort_order)
SELECT
  dt.workspace_id,
  dt.id,
  st.code,
  st.label,
  st.is_urgent,
  st.estimated_days,
  st.sort_order
FROM public.document_types dt
JOIN (VALUES
  -- 港澳台
  ('taiwan_pass',   'taiwan_pass_normal',   '台胞證 一般',   false,  7, 100),
  ('taiwan_pass',   'taiwan_pass_urgent',   '台胞證 急件',   true,   3, 110),
  ('hk_macau_pass', 'hk_macau_pass_normal', '港澳通行證 一般', false, 7, 120),
  -- 美洲
  ('visa_us',       'visa_us_normal',       '美簽 一般',     false, 30, 200),
  ('visa_us',       'visa_us_urgent',       '美簽 急件',     true,   7, 210),
  -- 亞洲
  ('visa_jp',       'visa_jp_normal',       '日簽 一般',     false,  7, 300),
  ('visa_jp',       'visa_jp_urgent',       '日簽 急件',     true,   3, 310),
  ('visa_kr',       'visa_kr_normal',       '韓簽 一般',     false,  7, 320),
  ('visa_vn',       'visa_vn_normal',       '越簽 一般',     false,  7, 330),
  ('visa_th',       'visa_th_normal',       '泰簽 一般',     false,  7, 340),
  -- 歐洲
  ('visa_schengen', 'visa_schengen_normal', '申根簽 一般',   false, 14, 400),
  ('visa_uk',       'visa_uk_normal',       '英簽 一般',     false, 21, 410),
  -- 大洋洲
  ('visa_au',       'visa_au_normal',       '澳簽 一般',     false, 14, 500),
  ('visa_nz',       'visa_nz_normal',       '紐簽 一般',     false, 14, 510)
) AS st(doc_code, code, label, is_urgent, estimated_days, sort_order)
  ON st.doc_code = dt.code
WHERE dt.deleted_at IS NULL
ON CONFLICT (workspace_id, code) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
-- 驗證
-- ════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_workspace_count int;
  v_doc_type_count int;
  v_svc_type_count int;
  v_feature_count int;
  v_cap_count int;
BEGIN
  SELECT count(*) INTO v_workspace_count FROM public.workspaces;
  SELECT count(*) INTO v_feature_count FROM public.workspace_features WHERE feature_code = 'visas' AND enabled = true;
  SELECT count(*) INTO v_doc_type_count FROM public.document_types WHERE deleted_at IS NULL;
  SELECT count(*) INTO v_svc_type_count FROM public.application_service_types WHERE deleted_at IS NULL;
  SELECT count(*) INTO v_cap_count FROM public.role_capabilities WHERE capability_code LIKE 'visas.%' AND enabled = true;

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE 'visas 模組 seed 完成：';
  RAISE NOTICE '  Workspaces: %', v_workspace_count;
  RAISE NOTICE '  workspace_features.visas enabled: % (應 = workspaces 數)', v_feature_count;
  RAISE NOTICE '  document_types: % (應 = workspaces × 14)', v_doc_type_count;
  RAISE NOTICE '  application_service_types: % (應 = workspaces × 14)', v_svc_type_count;
  RAISE NOTICE '  role_capabilities visas.*: % (應 = is_admin roles × 10)', v_cap_count;
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DELETE FROM public.role_capabilities WHERE capability_code LIKE 'visas.%';
-- DELETE FROM public.workspace_features WHERE feature_code = 'visas';
-- DELETE FROM public.application_service_types;
-- DELETE FROM public.document_types;
-- COMMIT;
