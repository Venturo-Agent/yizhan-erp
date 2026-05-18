-- 設定 pg_cron：每 30 秒把超過 25 秒沒更新的 debounce row 標成 is_expired = TRUE
-- 讓 /api/cron/line-flush 能查到並送出 AI 回覆
--
-- 為什麼 30 秒間隔：pg_cron 最小單位是 1 分鐘，但可用 cron 搭配兩個 offset 達到 30 秒效果
-- 最壞情況延遲：25s 靜默 + 30s cron + 5min GitHub Actions = ~6 分鐘（可接受）
--
-- 前置條件：需要 pg_cron extension（Supabase 已預裝）

BEGIN;

-- 確保 pg_cron extension 已啟用
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 移除舊 job（避免重複）
SELECT cron.unschedule('line-debounce-expire')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'line-debounce-expire'
);

-- 每分鐘標記過期：last_message_at 超過 25 秒且尚未送出
SELECT cron.schedule(
  'line-debounce-expire',
  '* * * * *',
  $$
    UPDATE public.line_bot_reply_debounce
    SET is_expired = TRUE,
        updated_at = NOW()
    WHERE is_expired = FALSE
      AND sent_at IS NULL
      AND last_message_at < NOW() - INTERVAL '25 seconds'
  $$
);

COMMIT;
