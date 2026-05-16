-- Add tour_type and days_count to tours table
-- tour_type: 'official' (正式團), 'proposal' (提案), 'template' (模板)
-- days_count: 天數（提案/模板用，沒有具體日期時記錄天數）

ALTER TABLE tours ADD COLUMN IF NOT EXISTS tour_type TEXT NOT NULL DEFAULT 'official';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS days_count INTEGER;

-- Make departure_date and return_date nullable (提案/模板不需要日期)
ALTER TABLE tours ALTER COLUMN departure_date DROP NOT NULL;
ALTER TABLE tours ALTER COLUMN return_date DROP NOT NULL;
