-- Add data_sources and response_mode fields to ai_settings table for simple mode

ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS data_sources TEXT DEFAULT '["attractions", "tours"]';
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS response_mode TEXT DEFAULT 'recommend';

-- Update existing rows with default values if null
UPDATE ai_settings SET data_sources = '["attractions", "tours"]' WHERE data_sources IS NULL;
UPDATE ai_settings SET response_mode = 'recommend' WHERE response_mode IS NULL;

-- Add comment
COMMENT ON COLUMN ai_settings.data_sources IS 'AI可用的資料來源：["itineraries", "suppliers", "attractions", "quotes"]';
COMMENT ON COLUMN ai_settings.response_mode IS '回覆方向：passive(被動回答) | recommend(主動推薦) | guide_booking(引導預約)';