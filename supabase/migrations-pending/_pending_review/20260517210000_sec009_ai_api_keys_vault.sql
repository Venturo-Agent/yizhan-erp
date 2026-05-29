-- ════════════════════════════════════════════════════════════════════
-- SEC-009: 將 AI API key 遷移至 Supabase Vault
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼要做這個：
--   目前 ANTHROPIC_API_KEY / GOOGLE_VISION_API_KEY 存放在 .env 檔案中，
--   以明文形式存在部署環境。Supabase Vault（基於 pgsodium）提供靜態加密
--   儲存，key 只能透過 DB function 讀取，不直接暴露在應用層環境變數中。
--
-- 前置條件（apply 前先確認）：
--   1. Supabase project 已啟用 pgsodium extension（Vault 的底層依賴）
--      確認方法：Supabase Dashboard > Database > Extensions > 搜尋 pgsodium
--   2. Supabase Vault 在 Dashboard 已啟用（不是所有 plan 都預設開）
--      確認方法：Supabase Dashboard > Vault > 確認頁面存在且可操作
--   3. 若 Vault 尚未啟用：聯絡 Supabase support 或在 Dashboard 啟用
--
-- 狀態：⚠️ PENDING REVIEW — 未 apply 到 production
-- 原因：無法遠端確認 ecrmtqnpzuatrhdvtnez project 的 Vault 啟用狀態
-- 動作：William 確認 Vault 已啟用後，才 apply 此 migration
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- Step 1: 確保 vault extension 已啟用
-- ────────────────────────────────────────────────────────────────────
-- 注意：vault extension 在 Supabase 中通常由平台管理，
-- 若 CREATE EXTENSION 失敗，表示 Vault 未在此 plan 開放
CREATE EXTENSION IF NOT EXISTS vault;

-- ────────────────────────────────────────────────────────────────────
-- Step 2: 建立讀取 vault secret 的 helper function
-- ────────────────────────────────────────────────────────────────────
-- 這個 function 供 API route 透過 RPC 呼叫，取得加密的 API key
-- security definer：以 function owner 權限執行（可讀 vault.secrets）
-- 只允許 service_role 呼叫，防止前端繞過直接讀取 key

CREATE OR REPLACE FUNCTION public.get_ai_api_key(key_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  -- 只允許 service_role 呼叫此 function
  -- authenticated role（前端）不得直接讀取 API key
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'get_ai_api_key: access denied for role %', current_user
      USING ERRCODE = '42501';
  END IF;

  SELECT decrypted_secret
  INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = key_name
  LIMIT 1;

  RETURN v_secret;
END;
$$;

-- function 擁有者：postgres（supabase 預設）
-- revoke 所有 public 權限，只給 service_role
REVOKE ALL ON FUNCTION public.get_ai_api_key(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ai_api_key(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.get_ai_api_key(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_api_key(TEXT) TO service_role;

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- Apply 完成後的手動步驟（SQL Editor 或 psql 執行）
-- ════════════════════════════════════════════════════════════════════
--
-- Step 3: 將實際 key 存入 Vault
-- （不可放進 migration 檔案！key 不能進 git repo）
--
-- 在 Supabase SQL Editor 執行（使用 service_role / postgres）：
--
--   SELECT vault.create_secret(
--     'ANTHROPIC_API_KEY',
--     'sk-ant-your-actual-key-here',
--     'Anthropic Claude API key，供 CIS analyze 及 AI brain 功能使用'
--   );
--
--   SELECT vault.create_secret(
--     'GOOGLE_VISION_API_KEY',
--     'your-actual-google-vision-key-here',
--     'Google Vision API key，供證件 OCR 辨識功能使用'
--   );
--
--   SELECT vault.create_secret(
--     'VENTURO_AI_BRAIN_KEY',
--     'sk-ant-your-actual-venturo-ai-key-here',
--     'Venturo AI Brain 主要 key（優先於 ANTHROPIC_API_KEY）'
--   );
--
-- Step 4: 驗證 key 是否正確存入
--
--   SELECT name, created_at FROM vault.secrets ORDER BY created_at DESC;
--
-- Step 5: 確認 RPC 可讀取（用 service_role client 呼叫）
--
--   SELECT public.get_ai_api_key('ANTHROPIC_API_KEY');
--
-- Step 6: 完成後，從部署環境移除 env var
--   - Coolify 設定中移除 ANTHROPIC_API_KEY、GOOGLE_VISION_API_KEY
--   - 保留 VENTURO_AI_BRAIN_KEY 直到 Vault 驗證穩定（graceful fallback）
--   - 詳見 src/lib/vault.ts 的說明
--
-- ════════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）
-- ════════════════════════════════════════════════════════════════════
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.get_ai_api_key(TEXT);
-- -- 注意：不 DROP vault extension，因為可能有其他 secret 在用
-- COMMIT;
