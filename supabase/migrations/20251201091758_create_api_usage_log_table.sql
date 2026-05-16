-- Create the api_usage_log table
CREATE TABLE IF NOT EXISTS public.api_usage_log (
    id bigserial PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    api_service text NOT NULL,
    notes text
);

-- Add a comment to the table and columns
COMMENT ON TABLE public.api_usage_log IS '紀錄對外部 API 的呼叫';
COMMENT ON COLUMN public.api_usage_log.api_service IS '被呼叫的 API 服務名稱，例如：Mindee OCR';
COMMENT ON COLUMN public.api_usage_log.notes IS '其他備註';

-- Enable Row Level Security
ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;

-- This policy allows service_role users (like backend functions) to insert into the log.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'api_usage_log' 
        AND policyname = 'Allow service_role to insert'
    ) THEN
        CREATE POLICY "Allow service_role to insert" ON public.api_usage_log FOR INSERT WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

-- This policy allows authenticated users to read the log (for the dashboard).
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'api_usage_log' 
        AND policyname = 'Allow authenticated users to read'
    ) THEN
        CREATE POLICY "Allow authenticated users to read" ON public.api_usage_log FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;
