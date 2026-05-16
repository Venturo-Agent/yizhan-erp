-- VENTURO platform workspace 補 workspace_features
-- 問題：VENTURO 建立時沒走 seed_tenant_base_data trigger、只有 cis 1 個 feature
-- → William 用 VENTURO 帳號登入、sidebar 只顯示「漫途客戶管理」、租戶管理等都被擋
--
-- 修法：複製 CORNER（founding user）完整 features 到 VENTURO + 加 tenants（平台管理）
-- idempotent：ON CONFLICT 處理重跑

-- 1. 複製 CORNER 全部 features
INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
SELECT 'aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid, feature_code, enabled
FROM public.workspace_features
WHERE workspace_id = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'::uuid  -- CORNER
ON CONFLICT (workspace_id, feature_code) DO UPDATE
SET enabled = EXCLUDED.enabled;

-- 2. tenants（平台管理路由、CORNER 不該有、VENTURO 必要）
INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
VALUES ('aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid, 'tenants', true)
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = true;

-- 3. cis 確保 enabled（VENTURO 主業）
INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
VALUES ('aed1bc23-7bbf-4c59-a8e3-12dbb3271f0a'::uuid, 'cis', true)
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = true;
