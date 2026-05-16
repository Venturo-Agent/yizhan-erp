-- ============================================================================
-- 20260503060000_member_age_negative_guard.sql
--
-- N-001b followup: trigger function 加負年齡防呆
-- 起因：上一個 migration backfill 後發現 2 筆團員生日寫成未來日期
--   （朱知遠 2047-07-27 / 鄭勝燦 2050-11-07、明顯民國年寫成西元）
--   負年齡 -21、-24 被分類成 infant、明顯荒謬。
--
-- 修法：負年齡（資料錯誤）fallback 到 adult、不歸 infant。
-- 真實 data quality issue 由 William 自己決定要不要修這 2 筆。
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compute_member_age_and_type()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  computed_age int;
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    computed_age := EXTRACT(YEAR FROM AGE(NEW.birth_date))::int;
    NEW.age := computed_age;
    NEW.member_type := CASE
      WHEN computed_age < 0 THEN 'adult'  -- 資料錯誤（未來生日）、fallback 不歸 infant
      WHEN computed_age < 2 THEN 'infant'
      WHEN computed_age <= 5 THEN 'child_a'
      WHEN computed_age <= 11 THEN 'child_b'
      WHEN computed_age <= 64 THEN 'adult'
      ELSE 'senior'
    END;
  ELSE
    NEW.age := NULL;
    IF NEW.member_type IS NULL THEN
      NEW.member_type := 'adult';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- 重 backfill 2 筆負年齡的（其他不影響）
ALTER TABLE public.order_members DISABLE TRIGGER tg_lock_order_members_ongoing;

UPDATE public.order_members
SET member_type = 'adult'
WHERE birth_date IS NOT NULL
  AND EXTRACT(YEAR FROM AGE(birth_date))::int < 0;

ALTER TABLE public.order_members ENABLE TRIGGER tg_lock_order_members_ongoing;

-- 同步更新 cron 排程的 SQL（同樣加防呆）
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'recompute-order-members-age-daily';

SELECT cron.schedule(
  'recompute-order-members-age-daily',
  '0 0 * * *',
  $cron$
  UPDATE public.order_members
  SET
    age = EXTRACT(YEAR FROM AGE(birth_date))::int,
    member_type = CASE
      WHEN EXTRACT(YEAR FROM AGE(birth_date))::int < 0 THEN 'adult'
      WHEN EXTRACT(YEAR FROM AGE(birth_date))::int < 2 THEN 'infant'
      WHEN EXTRACT(YEAR FROM AGE(birth_date))::int <= 5 THEN 'child_a'
      WHEN EXTRACT(YEAR FROM AGE(birth_date))::int <= 11 THEN 'child_b'
      WHEN EXTRACT(YEAR FROM AGE(birth_date))::int <= 64 THEN 'adult'
      ELSE 'senior'
    END
  WHERE birth_date IS NOT NULL;
  $cron$
);
