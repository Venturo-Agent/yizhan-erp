-- 設定藍新金流商店代號
-- 只更新 merchantId，保留其他設定

-- 先確保 system_settings 表存在且有 newebpay 記錄
INSERT INTO public.system_settings (category, settings, description)
VALUES (
  'newebpay',
  '{"merchantId": "MS3814348716", "hashKey": "", "hashIV": "", "isProduction": false}'::jsonb,
  '藍新金流旅行業代轉發票設定'
)
ON CONFLICT (category)
DO UPDATE SET
  settings = jsonb_set(
    COALESCE(system_settings.settings, '{}'::jsonb),
    '{merchantId}',
    '"MS3814348716"'
  ),
  updated_at = now();
