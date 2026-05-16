-- 更新藍新金流設定

BEGIN;

UPDATE public.system_settings
SET
  settings = jsonb_build_object(
    'merchantId', '',
    'hashKey', 'YsZf5WBrzAyKujdQX1qabToN60pkgGxl',
    'hashIV', 'P1KqUTm2Oh5SctBC',
    'isProduction', false
  ),
  updated_at = now()
WHERE category = 'newebpay';

COMMIT;
