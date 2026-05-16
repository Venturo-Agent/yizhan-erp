-- Create api_usage table for tracking API calls (like Google Vision)
-- 用於追蹤 API 呼叫次數，避免超過免費額度

BEGIN;

CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM format
  usage_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(api_name, month)
);

-- Add comment
COMMENT ON TABLE public.api_usage IS 'Tracks API usage counts per month to stay within free tier limits';
COMMENT ON COLUMN public.api_usage.api_name IS 'Name of the API (e.g., google_vision)';
COMMENT ON COLUMN public.api_usage.month IS 'Month in YYYY-MM format';
COMMENT ON COLUMN public.api_usage.usage_count IS 'Number of API calls made this month';

-- Disable RLS (per project policy)
ALTER TABLE public.api_usage DISABLE ROW LEVEL SECURITY;

COMMIT;
