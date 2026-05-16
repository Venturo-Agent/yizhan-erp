-- 添加简单模式字段到 ai_settings 表
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS data_sources JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS response_mode VARCHAR(20) DEFAULT 'passive';