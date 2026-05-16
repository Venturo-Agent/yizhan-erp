-- 設定藍新金流 MerchantID

BEGIN;

UPDATE public.system_settings
SET
  settings = jsonb_set(settings, '{merchantId}', '"83212711"'),
  updated_at = now()
WHERE category = 'newebpay';

COMMIT;
