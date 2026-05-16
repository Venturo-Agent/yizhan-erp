-- 設定藍新金流為正式環境
UPDATE public.system_settings
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{isProduction}',
  'true'
),
updated_at = now()
WHERE category = 'newebpay';
