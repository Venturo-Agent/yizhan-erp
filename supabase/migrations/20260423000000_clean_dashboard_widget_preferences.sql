-- 2026-04-23: 清 user_preferences 首頁 widget 順序殘留
-- 7 個 widget 名字（manifestation / weather-weekly / currency / flight /
-- supplier-quick-actions / weather / timer）已不存在、是歷史殘留
-- 只保留實際存在的 4 個：calculator / clock-in / notes / amadeus-totp
-- 保持原順序、純濾掉死名字
BEGIN;
UPDATE public.user_preferences
SET preference_value = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements_text(preference_value) AS elem
  WHERE elem IN ('calculator', 'clock-in', 'notes', 'amadeus-totp')
),
updated_at = NOW()
WHERE preference_key = 'homepage-widgets-order';
COMMIT;
