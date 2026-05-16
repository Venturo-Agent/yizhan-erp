-- ─────────────────────────────────────────────────────────────────────────────
-- integration_usage_log — 第三方 API 呼叫紀錄
-- 2026-05-14 William 拍板「客戶問為什麼不能用、我們能查得到」
--
-- 用途：
--   - 每次呼叫 OCR.space / LINE / FB / IG 等 third-party API、寫 1 筆
--   - 客戶問起「為什麼 OCR 不能用」→ 客服查 log（額度滿？API key 失效？網路？）
--   - 後續可加 UI 顯示「本月已用 X / 25,000」+ 最近呼叫紀錄
--
-- 設計：
--   - 不存敏感資料（不存 image / 不存護照內容）、只存「呼叫狀態 + 錯誤訊息」
--   - 用 partitioning 按月分區（之後 1 年後資料量大時切換）
--   - workspace 隔離靠 RLS
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS public.integration_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 哪個 workspace 用的
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- 哪個 integration（passport_ocr / line_oa / flight_search / fb_messenger / ig...）
  integration_code TEXT NOT NULL,
  -- 呼叫時間
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 成功 or 失敗
  success BOOLEAN NOT NULL,
  -- 失敗原因（成功時 null）
  error_message TEXT,
  -- 額外 metadata（如：file_count, response_time_ms, file_size、不存敏感資料）
  metadata JSONB,
  -- 觸發者 user_id（如有登入）
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- index 主要 query path：本月用量、最近紀錄
CREATE INDEX IF NOT EXISTS idx_iul_workspace_code_called
  ON public.integration_usage_log(workspace_id, integration_code, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_iul_called_at ON public.integration_usage_log(called_at DESC);

COMMENT ON TABLE public.integration_usage_log IS
  '第三方 API 呼叫紀錄、客服查「為什麼不能用」用、不存敏感資料';

-- RLS：workspace 隔離
ALTER TABLE public.integration_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iul_select ON public.integration_usage_log;
CREATE POLICY iul_select ON public.integration_usage_log
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

-- INSERT/UPDATE/DELETE 由 service_role 走（API route 內寫入）、不開給 authenticated
DROP POLICY IF EXISTS iul_no_write ON public.integration_usage_log;
CREATE POLICY iul_no_write ON public.integration_usage_log
  FOR INSERT TO authenticated WITH CHECK (false);

-- 驗證
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_schema='public' AND table_name='integration_usage_log';
  IF v_count < 7 THEN
    RAISE EXCEPTION 'integration_usage_log 欄位不足、count = %', v_count;
  END IF;
  RAISE NOTICE '✓ integration_usage_log 建好（% columns + 2 indexes + 2 policies）', v_count;
END $$;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TABLE IF EXISTS public.integration_usage_log CASCADE;
-- COMMIT;
