-- 設定藍新金流 HashKey 和 HashIV
UPDATE public.system_settings
SET settings = jsonb_set(
  jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{hashKey}',
    '"nPWXLUG3fjrtqZ05BAMcmzbE1kVeNWLZ"'
  ),
  '{hashIV}',
  '"PDCrxWEhXG0Se0PC"'
),
updated_at = now()
WHERE category = 'newebpay';
