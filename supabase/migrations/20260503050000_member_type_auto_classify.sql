-- ============================================================================
-- 20260503050000_member_type_auto_classify.sql
--
-- N-001b: 訂單成員年齡自動分類
-- William 2026-05-02 拍板：
--   - 用年紀區分成員類型、不要手填、系統自動算
--   - age 欄位保留（方便觀看）、由系統維護、不准 application 寫入
--   - 5 級分類：infant / child_a / child_b / adult / senior
--
-- 業務分級：
--   嬰兒 (infant)   未滿 2 歲      機票最便宜 / 不佔床 / 保險最低
--   兒童 A (child_a) 2-5 歲        機票兒童價 / 飯店看政策
--   兒童 B (child_b) 6-11 歲       機票兒童價 / 飯店多半佔床
--   成人 (adult)    12-64 歲       全價
--   長者 (senior)   65 歲以上      保險可能加費 / 部分活動限制
--
-- 設計：birth_date 是 SSOT、age + member_type 是衍生欄位、由 trigger 維護。
-- 沒填 birth_date 的、member_type 預設 'adult'、age 為 NULL。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. 換掉舊 check constraint（原本只允許 adult/child/infant、改成 5 級）
-- ----------------------------------------------------------------------------
ALTER TABLE public.order_members
  DROP CONSTRAINT IF EXISTS order_members_member_type_check;

ALTER TABLE public.order_members
  ADD CONSTRAINT order_members_member_type_check
  CHECK (member_type = ANY (ARRAY['infant', 'child_a', 'child_b', 'adult', 'senior']));

-- ----------------------------------------------------------------------------
-- 1. 自動分類 function
-- ----------------------------------------------------------------------------
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
      WHEN computed_age < 2 THEN 'infant'
      WHEN computed_age <= 5 THEN 'child_a'
      WHEN computed_age <= 11 THEN 'child_b'
      WHEN computed_age <= 64 THEN 'adult'
      ELSE 'senior'
    END;
  ELSE
    -- 沒生日：age NULL、member_type 維持原值（如果有）或 fallback adult
    NEW.age := NULL;
    IF NEW.member_type IS NULL THEN
      NEW.member_type := 'adult';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- ----------------------------------------------------------------------------
-- 2. 掛 trigger（INSERT / UPDATE birth_date 都會自動算）
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS compute_order_members_age_and_type ON public.order_members;
CREATE TRIGGER compute_order_members_age_and_type
  BEFORE INSERT OR UPDATE OF birth_date, member_type ON public.order_members
  FOR EACH ROW EXECUTE FUNCTION public.compute_member_age_and_type();

-- ----------------------------------------------------------------------------
-- 3. 補 default：member_type 沒給時 fallback adult（解 N-001 暴露的 INSERT bug）
-- ----------------------------------------------------------------------------
ALTER TABLE public.order_members
  ALTER COLUMN member_type SET DEFAULT 'adult';

-- ----------------------------------------------------------------------------
-- 4. Backfill：既有 117 筆有 birth_date 的、重算 age + member_type
--    沒 birth_date 的維持原值（150-117 = 33 筆、原本 member_type 已是 adult）
--
--    暫時關 tg_lock_order_members_ongoing（出團當天 lock）、
--    這個 lock 是給 application 用的、migration 是系統級 backfill 不該被擋。
-- ----------------------------------------------------------------------------
ALTER TABLE public.order_members DISABLE TRIGGER tg_lock_order_members_ongoing;

UPDATE public.order_members
SET
  age = EXTRACT(YEAR FROM AGE(birth_date))::int,
  member_type = CASE
    WHEN EXTRACT(YEAR FROM AGE(birth_date))::int < 2 THEN 'infant'
    WHEN EXTRACT(YEAR FROM AGE(birth_date))::int <= 5 THEN 'child_a'
    WHEN EXTRACT(YEAR FROM AGE(birth_date))::int <= 11 THEN 'child_b'
    WHEN EXTRACT(YEAR FROM AGE(birth_date))::int <= 64 THEN 'adult'
    ELSE 'senior'
  END
WHERE birth_date IS NOT NULL;

ALTER TABLE public.order_members ENABLE TRIGGER tg_lock_order_members_ongoing;

-- ----------------------------------------------------------------------------
-- 5. 每天凌晨 00:00 自動重算所有人的 age（生日過了會自動 +1）
--    用直接 UPDATE age + member_type、避開 application lock trigger
-- ----------------------------------------------------------------------------
-- 先把舊的 schedule 砍掉（idempotent、避免 migration replay 重複建）
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'recompute-order-members-age-daily';

SELECT cron.schedule(
  'recompute-order-members-age-daily',
  '0 0 * * *',  -- 每天 00:00 UTC
  $cron$
  UPDATE public.order_members
  SET
    age = EXTRACT(YEAR FROM AGE(birth_date))::int,
    member_type = CASE
      WHEN EXTRACT(YEAR FROM AGE(birth_date))::int < 2 THEN 'infant'
      WHEN EXTRACT(YEAR FROM AGE(birth_date))::int <= 5 THEN 'child_a'
      WHEN EXTRACT(YEAR FROM AGE(birth_date))::int <= 11 THEN 'child_b'
      WHEN EXTRACT(YEAR FROM AGE(birth_date))::int <= 64 THEN 'adult'
      ELSE 'senior'
    END
  WHERE birth_date IS NOT NULL;
  $cron$
);

-- ============================================================================
-- 注意：這 migration 後、application code（src/）不該再對 age 直接賦值。
-- order_members.age 由 trigger 維護、application 寫進去也會被 trigger 蓋掉。
-- ============================================================================
