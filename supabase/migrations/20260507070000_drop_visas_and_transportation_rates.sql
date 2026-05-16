-- 砍 visas + transportation_rates 兩個模組
--
-- 5/7 William 拍板：
--   - 「transportation-rates 不用」
--   - 「簽證模式也完全移除」
--   - 「簽證管理也完整的移除」
-- Calendar 完全保留（員工日常用、cascade 顯示 tours/customers）
--
-- 兩表都 0 rows、紅線 #0 OK
-- 0 FK 指向（無別表 reference）
--
-- 影響:
--   visas:                 DROP TABLE + 5 row workspace_features + 8 row role_capabilities
--   transportation_rates:  DROP TABLE + 0 row workspace_features + 0 row role_capabilities
--
-- RLS / triggers 隨 DROP TABLE CASCADE 自動清

BEGIN;

-- 1. visas
DROP TABLE IF EXISTS public.visas CASCADE;
DELETE FROM public.workspace_features WHERE feature_code = 'visas';
DELETE FROM public.role_capabilities WHERE capability_code IN ('visas.read', 'visas.write');

-- 2. transportation_rates
DROP TABLE IF EXISTS public.transportation_rates CASCADE;

COMMIT;
