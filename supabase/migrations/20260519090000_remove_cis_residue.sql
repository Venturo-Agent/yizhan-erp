-- 為什麼：
-- CIS 模組（漫途整合行銷專屬）已棄用、前端檔 + 路由 / sidebar / 權限 SSOT 已砍。
-- 本 migration 清 DB 殘留：
--   1. role_capabilities 內 cis.* row（42 個）
--   2. workspace_features 內 cis 系列 row（20 個）
--   3. storage bucket cis-audio + 對應 4 個 RLS policy（bucket 為空、安全可刪）
--
-- CIS 相關 DB table（cis_clients / cis_pricing_items / cis_visits）已不存在
-- （前面 migration 已 drop）、不在本範圍。
--
-- 不可逆：應用後 cis 權限完全消失、storage bucket 內容若有檔案會一併消失（已確認 0 file）。

BEGIN;

-- 1. 清 role_capabilities 內 cis.* row
DELETE FROM public.role_capabilities WHERE capability_code LIKE 'cis.%';

-- 2. 清 workspace_features 內 cis 系列 row（含 cis / cis.clients / cis.visits / cis.pricing 等）
DELETE FROM public.workspace_features WHERE feature_code = 'cis' OR feature_code LIKE 'cis.%' OR feature_code LIKE 'cis_%';

-- 3. 移除 storage bucket cis-audio 對應 RLS policy
DROP POLICY IF EXISTS "cis_audio_select" ON storage.objects;
DROP POLICY IF EXISTS "cis_audio_insert" ON storage.objects;
DROP POLICY IF EXISTS "cis_audio_update" ON storage.objects;
DROP POLICY IF EXISTS "cis_audio_delete" ON storage.objects;

-- 4. 砍 storage bucket cis-audio（先清 objects、再 drop bucket）
DELETE FROM storage.objects WHERE bucket_id = 'cis-audio';
DELETE FROM storage.buckets WHERE id = 'cis-audio';

COMMIT;

-- ════ Rollback（萬一爆炸、需手動重建）════
-- 反向 SQL 複雜（要從 historical role_capabilities seed 重建 + 重 INSERT bucket）、
-- 必要時參考 git history：
--   supabase/migrations/20260503300000_create_cis_workflow.sql（建 cis_* table + 權限 seed）
--   supabase/migrations/20260503310000_create_cis_audio_bucket.sql（建 storage bucket + RLS）
