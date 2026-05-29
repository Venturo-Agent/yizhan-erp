-- Stage 2: ref_countries + workspace_countries overlay
-- 計畫文件：docs/REFACTOR_PLAN_REF_DATA.md
--
-- 設計原則：
--   - ref_countries schema 按 ISO 3166-1 設計（未來要補到 249 國只是 INSERT）
--   - Stage 2 只 seed 既有 countries 表已經用到的國家（40 筆），零歷史風險
--   - workspace_countries 是 overlay（啟用開關），預設無資料 = 啟用
--   - Stage 4 UI 才會用上；Stage 3 業務表 FK 遷移才會開始引用

BEGIN;

-- ============================================================
-- 2.1 ref_countries
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ref_countries (
  code        text PRIMARY KEY,            -- ISO 3166-1 alpha-2
  name_zh     text NOT NULL,
  name_en     text NOT NULL,
  emoji       text,                        -- 🇹🇼 國旗
  continent   text,                        -- Asia / Europe / Africa / North America / South America / Oceania / Antarctica
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ref_countries_continent_idx ON public.ref_countries(continent);

ALTER TABLE public.ref_countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_countries_public_read   ON public.ref_countries;
DROP POLICY IF EXISTS ref_countries_admin_insert  ON public.ref_countries;
DROP POLICY IF EXISTS ref_countries_admin_update  ON public.ref_countries;
DROP POLICY IF EXISTS ref_countries_admin_delete  ON public.ref_countries;

CREATE POLICY ref_countries_public_read  ON public.ref_countries FOR SELECT TO authenticated USING (true);
CREATE POLICY ref_countries_admin_insert ON public.ref_countries FOR INSERT TO authenticated WITH CHECK (is_super_admin());
CREATE POLICY ref_countries_admin_update ON public.ref_countries FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY ref_countries_admin_delete ON public.ref_countries FOR DELETE TO authenticated USING (is_super_admin());

-- ============================================================
-- 2.2 Seed：既有 countries 表已使用的 40 國
-- ============================================================
INSERT INTO public.ref_countries (code, name_zh, name_en, emoji, continent) VALUES
  ('AE', '阿聯',        'United Arab Emirates', '🇦🇪', 'Asia'),
  ('AT', '奧地利',      'Austria',              '🇦🇹', 'Europe'),
  ('AU', '澳洲',        'Australia',            '🇦🇺', 'Oceania'),
  ('BO', '玻利維亞',    'Bolivia',              '🇧🇴', 'South America'),
  ('BR', '巴西',        'Brazil',               '🇧🇷', 'South America'),
  ('CA', '加拿大',      'Canada',               '🇨🇦', 'North America'),
  ('CH', '瑞士',        'Switzerland',          '🇨🇭', 'Europe'),
  ('CN', '中國',        'China',                '🇨🇳', 'Asia'),
  ('CZ', '捷克',        'Czech Republic',       '🇨🇿', 'Europe'),
  ('DE', '德國',        'Germany',              '🇩🇪', 'Europe'),
  ('EG', '埃及',        'Egypt',                '🇪🇬', 'Africa'),
  ('ES', '西班牙',      'Spain',                '🇪🇸', 'Europe'),
  ('FI', '芬蘭',        'Finland',              '🇫🇮', 'Europe'),
  ('FR', '法國',        'France',               '🇫🇷', 'Europe'),
  ('GB', '英國',        'United Kingdom',       '🇬🇧', 'Europe'),
  ('GR', '希臘',        'Greece',               '🇬🇷', 'Europe'),
  ('HK', '香港',        'Hong Kong',            '🇭🇰', 'Asia'),
  ('HR', '克羅埃西亞',  'Croatia',              '🇭🇷', 'Europe'),
  ('ID', '印尼',        'Indonesia',            '🇮🇩', 'Asia'),
  ('IS', '冰島',        'Iceland',              '🇮🇸', 'Europe'),
  ('IT', '義大利',      'Italy',                '🇮🇹', 'Europe'),
  ('JP', '日本',        'Japan',                '🇯🇵', 'Asia'),
  ('KH', '柬埔寨',      'Cambodia',             '🇰🇭', 'Asia'),
  ('KR', '韓國',        'South Korea',          '🇰🇷', 'Asia'),
  ('MO', '澳門',        'Macau',                '🇲🇴', 'Asia'),
  ('MY', '馬來西亞',    'Malaysia',             '🇲🇾', 'Asia'),
  ('NL', '荷蘭',        'Netherlands',          '🇳🇱', 'Europe'),
  ('NO', '挪威',        'Norway',               '🇳🇴', 'Europe'),
  ('NZ', '紐西蘭',      'New Zealand',          '🇳🇿', 'Oceania'),
  ('PH', '菲律賓',      'Philippines',          '🇵🇭', 'Asia'),
  ('PT', '葡萄牙',      'Portugal',             '🇵🇹', 'Europe'),
  ('QA', '卡達',        'Qatar',                '🇶🇦', 'Asia'),
  ('SA', '沙烏地阿拉伯','Saudi Arabia',         '🇸🇦', 'Asia'),
  ('SE', '瑞典',        'Sweden',               '🇸🇪', 'Europe'),
  ('SG', '新加坡',      'Singapore',            '🇸🇬', 'Asia'),
  ('TH', '泰國',        'Thailand',             '🇹🇭', 'Asia'),
  ('TR', '土耳其',      'Turkey',               '🇹🇷', 'Asia'),
  ('TW', '台灣',        'Taiwan',               '🇹🇼', 'Asia'),
  ('US', '美國',        'United States',        '🇺🇸', 'North America'),
  ('VN', '越南',        'Vietnam',              '🇻🇳', 'Asia')
ON CONFLICT (code) DO NOTHING;

DO $$ DECLARE v int; BEGIN
  SELECT count(*) INTO v FROM public.ref_countries;
  RAISE NOTICE 'ref_countries seeded: % rows', v;
END $$;

-- ============================================================
-- 2.4 workspace_countries overlay
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workspace_countries (
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  country_code  text NOT NULL REFERENCES public.ref_countries(code) ON DELETE CASCADE,
  is_enabled    boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  PRIMARY KEY (workspace_id, country_code)
);

CREATE INDEX IF NOT EXISTS workspace_countries_workspace_idx ON public.workspace_countries(workspace_id);

ALTER TABLE public.workspace_countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_countries_select ON public.workspace_countries;
DROP POLICY IF EXISTS workspace_countries_insert ON public.workspace_countries;
DROP POLICY IF EXISTS workspace_countries_update ON public.workspace_countries;
DROP POLICY IF EXISTS workspace_countries_delete ON public.workspace_countries;

-- 只允許當前 workspace 成員讀/寫自己的 overlay
CREATE POLICY workspace_countries_select ON public.workspace_countries
  FOR SELECT TO authenticated
  USING (workspace_id::text = get_current_user_workspace()::text);

CREATE POLICY workspace_countries_insert ON public.workspace_countries
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id::text = get_current_user_workspace()::text);

CREATE POLICY workspace_countries_update ON public.workspace_countries
  FOR UPDATE TO authenticated
  USING (workspace_id::text = get_current_user_workspace()::text)
  WITH CHECK (workspace_id::text = get_current_user_workspace()::text);

CREATE POLICY workspace_countries_delete ON public.workspace_countries
  FOR DELETE TO authenticated
  USING (workspace_id::text = get_current_user_workspace()::text);

-- ============================================================
-- 2.5 is_country_enabled(workspace, code) helper
-- ============================================================
-- 預設 opt-out：沒有 overlay 紀錄 = 啟用（避免破壞現況）
CREATE OR REPLACE FUNCTION public.is_country_enabled(p_workspace uuid, p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_enabled
       FROM public.workspace_countries
      WHERE workspace_id = p_workspace
        AND country_code = p_code),
    true
  );
$$;

COMMIT;
