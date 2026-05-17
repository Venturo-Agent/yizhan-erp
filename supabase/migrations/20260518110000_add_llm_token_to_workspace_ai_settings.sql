-- ============================================================================
-- Migration: workspace_ai_settings 加 LLM token 欄位（per-tenant LLM provider）
-- Date: 2026-05-18
-- Spec: William 2026-05-17 拍板「漫途幫客戶放電池」
--
-- 為什麼：
--   SaaS 上線後不可能讓所有客戶共用漫途的 Anthropic / OpenRouter 額度
--   （會被打爆 + 計費混亂）。每個 workspace 必須有自己的 LLM 設定、
--   由漫途 staff（有 workspaces.write capability 的員工）從「租戶管理」
--   UI 幫客戶填入、加密存 DB。
--
-- 現況：
--   workspace_ai_settings（20260510170000 建）已存在、目前裝 AI 行為設定
--   （prompt_template / data_sources / response_mode）、缺 LLM 連線資訊。
--   本 migration 擴此表、加 token / provider / model 等欄位。
--
-- 不新建表的理由：
--   一個 workspace 一筆 AI 設定（PK = workspace_id）、行為 + 連線都同顆粒度、
--   分兩表會 JOIN 增加複雜度、不符 SSOT 精神。
--
-- 紅線遵守：
--   - 純加欄位（ADD COLUMN IF NOT EXISTS）、不刪不改既有欄位
--   - 沿用既有 RLS policy（不重建、不改）— select 自己 workspace 或
--     workspaces.write、write 必須 workspaces.write
--   - 不開新 capability（沿用 workspaces.write）
--   - 不開新 feature（沿用 workspaces feature）
--   - 紅線 B：created_by / updated_by FK 指 employees(id)、不指 auth.users
--   - 加密：api_token 一律走 VENTURO_INTEGRATION_ENCRYPTION_KEY AES-256-GCM
--     加密後存 _encrypted 欄位（跟 workspace_line_settings 同 pattern）、
--     code 寫入時走 src/lib/crypto/integration-encryption.ts encryptIntegrationSecret
--
-- CHECK constraint：
--   - provider 限 enum：minimax / anthropic / openrouter
--   - is_active=true 必須有 api_token_encrypted + provider + model
--     （避免 UI 上「啟用」但 token 沒填、跑起來才炸）
--
-- 影響範圍：
--   - 純加欄位、零 caller 影響
--   - 跑完 NOTIFY pgrst reload schema、PostgREST schema cache 立即生效
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. 加新欄位
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.workspace_ai_settings
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS api_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.employees(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workspace_ai_settings.provider IS
  'LLM 服務商代號：minimax（中國家、預設）/ anthropic（Claude）/ openrouter（多家統一介面）';
COMMENT ON COLUMN public.workspace_ai_settings.model IS
  '模型代號、跟 provider 對應（例 MiniMax-Text-01 / claude-sonnet-4-5）';
COMMENT ON COLUMN public.workspace_ai_settings.api_token_encrypted IS
  'AES-256-GCM 加密的 API token、明文不入 DB / 不入 log / 不送 client。';
COMMENT ON COLUMN public.workspace_ai_settings.is_active IS
  '是否啟用 LLM 連線；true 必須有 token + provider + model（CHECK constraint 守）';
COMMENT ON COLUMN public.workspace_ai_settings.last_used_at IS
  '最後一次 LLM call 成功的時間、為未來計費（Phase 2B）鋪路';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CHECK constraint
-- ─────────────────────────────────────────────────────────────────────────────

-- provider 限 enum（idempotent：先 drop 再 add）
ALTER TABLE public.workspace_ai_settings
  DROP CONSTRAINT IF EXISTS workspace_ai_settings_provider_check;
ALTER TABLE public.workspace_ai_settings
  ADD CONSTRAINT workspace_ai_settings_provider_check
  CHECK (provider IS NULL OR provider IN ('minimax', 'anthropic', 'openrouter'));

-- 啟用一致性：is_active=true 必須有完整三件套
ALTER TABLE public.workspace_ai_settings
  DROP CONSTRAINT IF EXISTS workspace_ai_settings_active_requires_token;
ALTER TABLE public.workspace_ai_settings
  ADD CONSTRAINT workspace_ai_settings_active_requires_token
  CHECK (
    NOT is_active
    OR (api_token_encrypted IS NOT NULL AND provider IS NOT NULL AND model IS NOT NULL)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Index：is_active=true 的 partial index（handler 查活躍 workspace 用）
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_workspace_ai_settings_active
  ON public.workspace_ai_settings(workspace_id)
  WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. NOTIFY pgrst reload schema（讓 PostgREST 立即看到新欄位）
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- ALTER TABLE public.workspace_ai_settings
--   DROP CONSTRAINT IF EXISTS workspace_ai_settings_provider_check,
--   DROP CONSTRAINT IF EXISTS workspace_ai_settings_active_requires_token;
-- DROP INDEX IF EXISTS public.idx_workspace_ai_settings_active;
-- ALTER TABLE public.workspace_ai_settings
--   DROP COLUMN IF EXISTS provider,
--   DROP COLUMN IF EXISTS model,
--   DROP COLUMN IF EXISTS api_token_encrypted,
--   DROP COLUMN IF EXISTS is_active,
--   DROP COLUMN IF EXISTS last_used_at,
--   DROP COLUMN IF EXISTS created_by,
--   DROP COLUMN IF EXISTS updated_by;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
