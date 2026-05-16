-- 系統設定表
-- 用於儲存各種系統設定（如藍新金鑰等）

BEGIN;

-- 建立 system_settings 表
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,           -- 設定類別（如 newebpay, general 等）
  settings jsonb NOT NULL DEFAULT '{}',  -- 設定內容
  description text,                 -- 說明
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- 每個類別只能有一筆設定
  CONSTRAINT unique_category UNIQUE (category)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- 註解
COMMENT ON TABLE public.system_settings IS '系統設定';
COMMENT ON COLUMN public.system_settings.category IS '設定類別';
COMMENT ON COLUMN public.system_settings.settings IS '設定內容（JSON 格式）';

-- RLS 設定（內部管理系統，禁用 RLS）
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

-- 預設插入藍新設定（空白）
INSERT INTO public.system_settings (category, settings, description)
VALUES (
  'newebpay',
  '{
    "merchantId": "",
    "hashKey": "",
    "hashIV": "",
    "isProduction": false
  }',
  '藍新金流旅行業代轉發票設定'
)
ON CONFLICT (category) DO NOTHING;

COMMIT;
