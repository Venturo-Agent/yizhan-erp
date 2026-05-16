-- ─────────────────────────────────────────────────────────────────────────────
-- setup_tokens 表 — 一次性 Magic Link 系統
-- 2026-05-14 Logan + William 拍板
--
-- 業務目的：漫途 admin 生成一次性連結、發給客戶、客戶開連結直接進指定的 setup 頁、
--           填完表單 token 失效。對標 Stripe / Auth0 / SendGrid invitation link 機制。
--
-- 流程：
--   1. 漫途 admin 在租戶管理 → 某 workspace → API 整合 tab → 點「發 setup 連結」
--   2. 後端生成 token（32 byte url-safe random）、scope 限定該 integration
--   3. 連結：https://erp.venturo.tw/setup/<token>
--   4. 客戶開連結 → 直接進 setup 頁（不需登入、token 是 auth）
--   5. 客戶貼 API key + 點儲存 → token 標 used、redeem 完成
--   6. token 預設 24h 過期、或填完即失效
--
-- 安全：
--   - token 是 URL-safe random、夠 entropy 不可猜測
--   - scope 嚴格限制（只能填指定 integration_code 的指定欄位）
--   - 過期 / used 後 verify 會 fail
--   - audit log 紀錄誰生成、誰用、何時用
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS public.setup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- token：URL-safe 隨機字串、客戶開連結時帶的 path param
  token TEXT NOT NULL UNIQUE,
  -- 對應 workspace（這個 token 只能設這個 workspace 的整合）
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- 對應 integration_code（passport_ocr / line_oa / flight_search / fb_messenger / ig...）
  integration_code TEXT NOT NULL,
  -- 過期時間（漫途生成時設、預設 +24h）
  expires_at TIMESTAMPTZ NOT NULL,
  -- redeem 時間（NULL = 未用、有值 = 已用、之後不可再用）
  used_at TIMESTAMPTZ,
  -- 用 token 的 user info（redeem 時記錄、可能不是客戶員工、是中間人）
  used_by_ip TEXT,
  used_by_user_agent TEXT,
  -- 漫途 admin 誰生成的
  created_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- index for token lookup（verify / redeem 主要 query path）
CREATE INDEX IF NOT EXISTS idx_setup_tokens_token ON public.setup_tokens(token);
CREATE INDEX IF NOT EXISTS idx_setup_tokens_workspace ON public.setup_tokens(workspace_id);
CREATE INDEX IF NOT EXISTS idx_setup_tokens_expires ON public.setup_tokens(expires_at) WHERE used_at IS NULL;

COMMENT ON TABLE public.setup_tokens IS
  '一次性 Magic Link tokens — 漫途 admin 生成、客戶用連結直接進 setup 頁、用過即失效';

-- ═══ RLS：service_role only（不對外開放、API route 內走 admin client）═══
ALTER TABLE public.setup_tokens ENABLE ROW LEVEL SECURITY;
-- 唯一 policy：authenticated 不能直接讀/寫（API route 用 service_role bypass）
-- service_role 自動 bypass、無需 explicit policy
DROP POLICY IF EXISTS setup_tokens_no_authenticated ON public.setup_tokens;
CREATE POLICY setup_tokens_no_authenticated ON public.setup_tokens
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 驗證
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_schema='public' AND table_name='setup_tokens';
  IF v_count < 10 THEN
    RAISE EXCEPTION 'setup_tokens 欄位不足、count = %', v_count;
  END IF;
  RAISE NOTICE '✓ setup_tokens 建好（% columns + 3 indexes + 1 policy）', v_count;
END $$;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP TABLE IF EXISTS public.setup_tokens CASCADE;
-- COMMIT;
