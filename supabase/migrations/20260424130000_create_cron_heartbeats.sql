-- =============================================
-- Migration: 建立 cron_heartbeats 表追蹤 cron job 執行狀態 (🟠 #17)
-- Date: 2026-04-24
--
-- 背景:
--   Vercel cron 每天半夜跑 (ticket-status 凌晨2點 / auto-insurance 凌晨1點)
--   現況: 跑失敗只有 Vercel log 知道、沒 alert、早上才發現 → 一天 lag
--
-- 機制:
--   - Cron handler 開始時 UPSERT started_at
--   - 成功結束寫 status='success' + finished_at + duration
--   - 失敗寫 status='failed' + last_error
--   - 外部 monitor (Sentry / UptimeRobot) query 此表、看是否 stale
--     (例: ticket-status 超過 25 小時沒跑成功 → alert)
-- =============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.cron_heartbeats (
  job_name text PRIMARY KEY,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms int,
  status text CHECK (status IN ('running', 'success', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cron_heartbeats ENABLE ROW LEVEL SECURITY;

-- 只 service_role 可寫讀 (沒 policy = 預設拒絕)
COMMENT ON TABLE public.cron_heartbeats IS
  'Cron job heartbeat 記錄。cron handler 透過 src/lib/cron/heartbeat.ts 寫入。外部 monitor 查此表判斷 stale。';

COMMIT;
