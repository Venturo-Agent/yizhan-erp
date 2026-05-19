-- ════════════════════════════════════════════════════════════════════
-- llm_usage_logs — LLM 呼叫用量記帳（per workspace / provider / model）
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼建：
--   現況：dispatcher 每次 call LLM 後只更新 workspace_ai_settings.last_used_at、
--   沒記 token 數 / 成本。SaaS 化後要按用量計費、必須記。
--
--   2026-05-19 William 拍板：今天搞定 AI 記帳。
--
--   選自建（不用 Langfuse / Helicone）的理由：
--   - 規模小（1 萬 calls/月）、外部工具是過度設計
--   - 我們已有 llm-dispatcher SSOT、加一張表就完事
--   - 定價走 LiteLLM 開源 JSON（業界標準、季更新）
--
-- 6 層 SOP：
--   L1 Feature Gate → ai_hub（不要新 feature、就用既有的）
--   L2 Capability   → 內部 telemetry、寫入走 service_role、不對外開讀
--   L3 三維 Scope   → workspace 隔離（純記錄、不分部門）
--   L4 狀態守門     → N/A（append-only、不改不刪）
--   L5 RLS          → setup_workspace_scoped_rls（read 守 workspace 隔離）
--   L6 防呆 SSOT    → 寫入走 recordLLMUsage helper、不准散刻
--
-- 規模估算（避免後續驚嚇）：
--   - 1 萬 calls/月 × 12 月 × 100 workspace（5 年後）= 1200 萬 row
--   - 每 row ~ 200 byte = 2.4 GB → Supabase Pro 8 GB 撐
--   - 真到了再 partition by month

BEGIN;

CREATE TABLE public.llm_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- LLM 識別
  provider text NOT NULL,        -- 'minimax' / 'anthropic' / 'openrouter'
  model text NOT NULL,           -- 'MiniMax-M2' / 'claude-sonnet-4-6' / 等

  -- token 用量（從 LLM response 抽出）
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,

  -- 推算成本（USD、定價來源 LiteLLM JSON、季更新）
  cost_usd numeric(12, 8) NOT NULL DEFAULT 0,

  -- 呼叫脈絡
  latency_ms integer,
  caller text,                   -- 'ai-brain' / 'memory-summarizer' / 'retrospective-aggregator' / 'attraction-polish' / 'line-llm-compose' / 'unknown'
  success boolean NOT NULL DEFAULT true,
  error_code text,               -- 失敗時記、給未來 dashboard 分析「哪種錯最多」

  -- 審計（哪個員工觸發、AI 自動則 null）
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════ Index ══════

-- 主查詢：某 workspace 月用量
CREATE INDEX llm_usage_logs_workspace_month_idx
  ON public.llm_usage_logs (workspace_id, created_at DESC);

-- 按 provider 分組查（看哪家 LLM 花最多）
CREATE INDEX llm_usage_logs_workspace_provider_idx
  ON public.llm_usage_logs (workspace_id, provider, created_at DESC);

-- 失敗訊息分析（debug 用）
CREATE INDEX llm_usage_logs_failure_idx
  ON public.llm_usage_logs (workspace_id, success, created_at DESC)
  WHERE success = false;

-- ══════ RLS ══════

CALL public.setup_workspace_scoped_rls('llm_usage_logs');

-- ══════ Monthly aggregation view ══════
-- 主要報表入口、不必每次 SUM 大表

CREATE OR REPLACE VIEW public.v_llm_usage_monthly AS
SELECT
  workspace_id,
  provider,
  model,
  date_trunc('month', created_at AT TIME ZONE 'Asia/Taipei')::date AS month,
  SUM(prompt_tokens) AS total_in_tokens,
  SUM(completion_tokens) AS total_out_tokens,
  SUM(total_tokens) AS total_tokens,
  SUM(cost_usd) AS total_cost_usd,
  COUNT(*) AS call_count,
  COUNT(*) FILTER (WHERE NOT success) AS fail_count
FROM public.llm_usage_logs
GROUP BY workspace_id, provider, model, date_trunc('month', created_at AT TIME ZONE 'Asia/Taipei')::date;

COMMENT ON TABLE public.llm_usage_logs IS
  'LLM 呼叫用量記帳（append-only）。dispatcher fire-and-forget 寫入、給 SaaS 計費鋪路。定價來源 LiteLLM model_prices_and_context_window.json。';
COMMENT ON COLUMN public.llm_usage_logs.caller IS
  '誰呼叫了 dispatcher：ai-brain / memory-summarizer / retrospective-aggregator / attraction-polish / line-llm-compose / unknown';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP VIEW IF EXISTS public.v_llm_usage_monthly;
-- DROP TABLE IF EXISTS public.llm_usage_logs CASCADE;
-- COMMIT;
