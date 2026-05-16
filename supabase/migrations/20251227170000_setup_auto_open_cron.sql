-- =====================================================
-- 設定 pg_cron 自動開啟團對話排程
-- 每天早上 6:00 (UTC+8) 自動執行
-- =====================================================

-- 1. 確保 pg_cron 擴展已啟用
-- 注意：Supabase 專案需要在 Dashboard > Database > Extensions 啟用 pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 授權 postgres 用戶執行 cron 任務
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- 3. 建立自動開啟對話的排程任務
-- 每天早上 6:00 (UTC+8 = 22:00 UTC 前一天) 執行
-- Cron 格式：分 時 日 月 週幾
-- 0 22 * * * = 每天 22:00 UTC = 06:00 UTC+8

-- 先刪除已存在的任務（避免重複）
SELECT cron.unschedule('auto_open_tour_conversations')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto_open_tour_conversations'
);

-- 建立排程任務
SELECT cron.schedule(
  'auto_open_tour_conversations',  -- 任務名稱
  '0 22 * * *',                    -- Cron 表達式：每天 22:00 UTC (06:00 台北時間)
  $$SELECT auto_open_tour_conversations()$$
);

-- 4. 建立手動執行和查看狀態的輔助函數

-- 4.1 手動執行自動開啟（給管理員用）
CREATE OR REPLACE FUNCTION run_auto_open_now()
RETURNS TABLE (
  opened_count integer,
  executed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    auto_open_tour_conversations() as opened_count,
    now() as executed_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION run_auto_open_now() IS '手動執行自動開啟對話，返回開啟數量';

-- 4.2 查看排程任務狀態
CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS TABLE (
  job_name text,
  schedule text,
  last_run timestamptz,
  next_run timestamptz,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobname::text as job_name,
    j.schedule::text as schedule,
    (SELECT max(start_time) FROM cron.job_run_details WHERE jobid = j.jobid) as last_run,
    (j.schedule::cron.cron_schedule)::text as next_run,
    COALESCE(
      (SELECT status FROM cron.job_run_details WHERE jobid = j.jobid ORDER BY start_time DESC LIMIT 1),
      'never_run'
    ) as status
  FROM cron.job j
  WHERE j.jobname = 'auto_open_tour_conversations';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_cron_job_status() IS '查看自動開啟對話排程任務的狀態';

-- 5. 建立執行紀錄表（可選，用於追蹤）
CREATE TABLE IF NOT EXISTS public.cron_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  executed_at timestamptz DEFAULT now(),
  result jsonb,
  success boolean DEFAULT true,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_job_name ON public.cron_execution_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_logs_executed_at ON public.cron_execution_logs(executed_at DESC);

COMMENT ON TABLE public.cron_execution_logs IS 'Cron 任務執行紀錄';

-- 6. 建立包裝函數，記錄執行結果
CREATE OR REPLACE FUNCTION auto_open_tour_conversations_with_logging()
RETURNS void AS $$
DECLARE
  opened integer;
BEGIN
  -- 執行自動開啟
  SELECT auto_open_tour_conversations() INTO opened;

  -- 記錄結果
  INSERT INTO public.cron_execution_logs (job_name, result, success)
  VALUES (
    'auto_open_tour_conversations',
    jsonb_build_object('opened_count', opened),
    true
  );
EXCEPTION WHEN OTHERS THEN
  -- 記錄錯誤
  INSERT INTO public.cron_execution_logs (job_name, success, error_message)
  VALUES (
    'auto_open_tour_conversations',
    false,
    SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 更新排程任務使用帶記錄的函數
SELECT cron.unschedule('auto_open_tour_conversations')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto_open_tour_conversations'
);

SELECT cron.schedule(
  'auto_open_tour_conversations',
  '0 22 * * *',  -- 每天 06:00 台北時間
  $$SELECT auto_open_tour_conversations_with_logging()$$
);

-- =====================================================
-- 完成
-- =====================================================

COMMENT ON EXTENSION pg_cron IS '用於自動開啟團對話的排程任務';
