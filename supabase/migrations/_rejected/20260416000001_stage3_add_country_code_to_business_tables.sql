-- Stage 3: 業務表新增 country_code 欄位並 FK 指向 ref_countries
-- 計畫文件：docs/REFACTOR_PLAN_REF_DATA.md
--
-- 策略：雙欄並存（country_id 留存、country_code 新增）
--   - 所有業務表 ADD country_code text + FK → ref_countries(code)
--   - 從 countries JOIN backfill 既有資料
--   - BEFORE INSERT/UPDATE trigger：寫 country_id 時自動帶入 country_code
--   - 業務 TS 程式碼零改動（繼續用 country_id，新寫入自動同步 country_code）
--   - Stage 5 再 DROP country_id
--
-- 資料完整性（2026-04-16 盤點）：
--   - countries：40 distinct codes，全部存在於 ref_countries
--   - 13 張業務表：0 orphan country_id

BEGIN;

-- ============================================================
-- 共用 trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_country_code_from_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 若 country_id 有值但 country_code 沒填，自動從 countries 帶入
  IF NEW.country_id IS NOT NULL AND (NEW.country_code IS NULL OR NEW.country_code = '') THEN
    SELECT code INTO NEW.country_code FROM public.countries WHERE id = NEW.country_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 為 13 張業務表套同樣的模式
-- ============================================================
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'attractions','cities','hotels','image_library','luxury_hotels',
    'michelin_restaurants','premium_experiences','quotes','regions',
    'restaurants','suppliers','tours','transportation_rates'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- 1. 新增 country_code 欄位（若尚未存在）
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS country_code text', tbl);

    -- 2. backfill：從 countries JOIN 取 code
    EXECUTE format($f$
      UPDATE public.%I t
         SET country_code = c.code
        FROM public.countries c
       WHERE t.country_id = c.id
         AND (t.country_code IS NULL OR t.country_code = '')
    $f$, tbl);

    -- 3. 建立 trigger
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_sync_country_code ON public.%I', tbl, tbl);
    EXECUTE format($f$
      CREATE TRIGGER trg_%I_sync_country_code
      BEFORE INSERT OR UPDATE OF country_id ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.sync_country_code_from_id()
    $f$, tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- 個別 FK constraint（必須逐張下，不能用動態 SQL 中斷）
-- ============================================================
ALTER TABLE public.attractions            ADD CONSTRAINT attractions_country_code_fkey            FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);
ALTER TABLE public.cities                 ADD CONSTRAINT cities_country_code_fkey                 FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);
ALTER TABLE public.hotels                 ADD CONSTRAINT hotels_country_code_fkey                 FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);
ALTER TABLE public.image_library          ADD CONSTRAINT image_library_country_code_fkey          FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);
ALTER TABLE public.luxury_hotels          ADD CONSTRAINT luxury_hotels_country_code_fkey          FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);
ALTER TABLE public.michelin_restaurants   ADD CONSTRAINT michelin_restaurants_country_code_fkey   FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);
ALTER TABLE public.premium_experiences    ADD CONSTRAINT premium_experiences_country_code_fkey    FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);
ALTER TABLE public.quotes                 ADD CONSTRAINT quotes_country_code_fkey                 FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);
ALTER TABLE public.regions                ADD CONSTRAINT regions_country_code_fkey                FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);
ALTER TABLE public.restaurants            ADD CONSTRAINT restaurants_country_code_fkey            FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);
ALTER TABLE public.suppliers              ADD CONSTRAINT suppliers_country_code_fkey              FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);
ALTER TABLE public.tours                  ADD CONSTRAINT tours_country_code_fkey                  FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);
ALTER TABLE public.transportation_rates   ADD CONSTRAINT transportation_rates_country_code_fkey   FOREIGN KEY (country_code) REFERENCES public.ref_countries(code);

-- ============================================================
-- 驗證：每張表 country_code 的 non-null 筆數必須等於原 country_id 的 non-null 筆數
-- ============================================================
DO $$
DECLARE
  r record;
  v_id int;
  v_code int;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'attractions','cities','hotels','image_library','luxury_hotels',
    'michelin_restaurants','premium_experiences','quotes','regions',
    'restaurants','suppliers','tours','transportation_rates'
  ]) AS t LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE country_id IS NOT NULL', r.t) INTO v_id;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE country_code IS NOT NULL', r.t) INTO v_code;
    IF v_id <> v_code THEN
      RAISE EXCEPTION 'backfill mismatch on %: country_id=% country_code=%', r.t, v_id, v_code;
    END IF;
  END LOOP;
END $$;

COMMIT;
