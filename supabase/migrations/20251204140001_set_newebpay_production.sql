-- 設定藍新金流為正式環境

BEGIN;

UPDATE public.system_settings
SET
  settings = jsonb_set(settings, '{isProduction}', 'true'),
  updated_at = now()
WHERE category = 'newebpay';

COMMIT;
