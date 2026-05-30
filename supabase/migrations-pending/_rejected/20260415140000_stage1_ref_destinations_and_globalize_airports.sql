-- Stage 1: 建 ref_destinations + 搬假 IATA + ref_airports 全域化
-- 計畫文件：docs/REFACTOR_PLAN_REF_DATA.md
--
-- 1A. 建 ref_destinations（全域目的地表）
-- 1B. 搬 YLN/KTG/CHW/NTO/MLC 到 ref_destinations
-- 1C. ref_airports 去除 workspace_id，變成全域單一表
--
-- 注意：is_favorite / usage_count 留在 ref_airports 作為 Stage 1 技術債，
-- 後續 Stage 會以 workspace_airports overlay 表取代（避免跨租戶污染）。

BEGIN;

-- ============================================================
-- 1A. ref_destinations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ref_destinations (
  code           text PRIMARY KEY,
  short_alias    text UNIQUE,
  country_code   text NOT NULL,
  name_zh        text,
  name_zh_tw     text,
  name_zh_cn     text,
  name_en        text,
  name_ja        text,
  name_ko        text,
  name_th        text,
  type           text,
  parent_code    text REFERENCES public.ref_destinations(code),
  default_airport text,
  google_maps_url text,
  google_place_id text,
  latitude       numeric,
  longitude      numeric,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ref_destinations_country_idx     ON public.ref_destinations(country_code);
CREATE INDEX IF NOT EXISTS ref_destinations_short_alias_idx ON public.ref_destinations(short_alias);

ALTER TABLE public.ref_destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_destinations_public_read   ON public.ref_destinations;
DROP POLICY IF EXISTS ref_destinations_admin_insert  ON public.ref_destinations;
DROP POLICY IF EXISTS ref_destinations_admin_update  ON public.ref_destinations;
DROP POLICY IF EXISTS ref_destinations_admin_delete  ON public.ref_destinations;

CREATE POLICY ref_destinations_public_read  ON public.ref_destinations FOR SELECT TO authenticated USING (true);
CREATE POLICY ref_destinations_admin_insert ON public.ref_destinations FOR INSERT TO authenticated WITH CHECK (is_super_admin());
CREATE POLICY ref_destinations_admin_update ON public.ref_destinations FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY ref_destinations_admin_delete ON public.ref_destinations FOR DELETE TO authenticated USING (is_super_admin());

-- ============================================================
-- 1B. Seed 5 筆台灣非機場目的地
-- ============================================================
INSERT INTO public.ref_destinations (code, short_alias, country_code, name_zh, name_zh_tw, name_en, type) VALUES
  ('TW-YILAN',    'YLN', 'TW', '宜蘭', '宜蘭', 'Yilan',    'region'),
  ('TW-KENTING',  'KTG', 'TW', '墾丁', '墾丁', 'Kenting',  'scenic_spot'),
  ('TW-CHANGHUA', 'CHW', 'TW', '彰化', '彰化', 'Changhua', 'region'),
  ('TW-NANTOU',   'NTO', 'TW', '南投', '南投', 'Nantou',   'region'),
  ('TW-MIAOLI',   'MLC', 'TW', '苗栗', '苗栗', 'Miaoli',   'region')
ON CONFLICT (code) DO NOTHING;

-- 從 ref_airports 移除假 IATA
DELETE FROM public.ref_airports WHERE iata_code IN ('YLN','KTG','CHW','NTO','MLC');

DO $$ DECLARE v int; BEGIN
  SELECT count(*) INTO v FROM public.ref_airports WHERE iata_code IN ('YLN','KTG','CHW','NTO','MLC');
  IF v <> 0 THEN RAISE EXCEPTION 'fake IATAs not cleared: %', v; END IF;
END $$;

-- ============================================================
-- 1C. ref_airports 全域化
-- ============================================================
-- 先刪舊 RLS policies（都依賴 workspace_id）
DROP POLICY IF EXISTS ref_airports_public_read           ON public.ref_airports;
DROP POLICY IF EXISTS ref_airports_select                ON public.ref_airports;
DROP POLICY IF EXISTS ref_airports_insert                ON public.ref_airports;
DROP POLICY IF EXISTS ref_airports_update                ON public.ref_airports;
DROP POLICY IF EXISTS ref_airports_delete                ON public.ref_airports;
DROP POLICY IF EXISTS ref_airports_authenticated_insert  ON public.ref_airports;
DROP POLICY IF EXISTS ref_airports_authenticated_update  ON public.ref_airports;

-- Dedupe：每個 iata_code 只留一筆（資料內容在各 workspace 皆相同）
DELETE FROM public.ref_airports a
USING public.ref_airports b
WHERE a.ctid < b.ctid
  AND a.iata_code = b.iata_code;

-- 移除 workspace 依賴
ALTER TABLE public.ref_airports DROP CONSTRAINT ref_airports_pkey;
ALTER TABLE public.ref_airports DROP CONSTRAINT ref_airports_workspace_id_fkey;
ALTER TABLE public.ref_airports DROP COLUMN workspace_id;
ALTER TABLE public.ref_airports ADD PRIMARY KEY (iata_code);

-- 新 RLS：讀取開放、寫入僅 super admin
CREATE POLICY ref_airports_public_read  ON public.ref_airports FOR SELECT TO authenticated USING (true);
CREATE POLICY ref_airports_admin_insert ON public.ref_airports FOR INSERT TO authenticated WITH CHECK (is_super_admin());
CREATE POLICY ref_airports_admin_update ON public.ref_airports FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY ref_airports_admin_delete ON public.ref_airports FOR DELETE TO authenticated USING (is_super_admin());

DO $$ DECLARE v int; BEGIN
  SELECT count(*) INTO v FROM public.ref_airports;
  RAISE NOTICE 'ref_airports final row count: %', v;
END $$;

COMMIT;
