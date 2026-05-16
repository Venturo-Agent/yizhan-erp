-- 領隊資料表
-- 用於記錄外部合作領隊的資訊（不需要登入系統）

BEGIN;

-- 1. 建立表格
CREATE TABLE IF NOT EXISTS public.tour_leaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE,

  -- 基本資料
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,

  -- 證件資料
  national_id VARCHAR(20),
  passport_number VARCHAR(50),
  passport_expiry DATE,

  -- 專業資料
  languages TEXT[] DEFAULT '{}',
  specialties TEXT[] DEFAULT '{}',
  license_number VARCHAR(50),

  -- 管理欄位
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  display_order INTEGER DEFAULT 0,

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_tour_leaders_code ON public.tour_leaders(code);
CREATE INDEX IF NOT EXISTS idx_tour_leaders_status ON public.tour_leaders(status);
CREATE INDEX IF NOT EXISTS idx_tour_leaders_name ON public.tour_leaders(name);

-- 3. RLS 政策（基礎資料：允許所有認證用戶讀寫）
ALTER TABLE public.tour_leaders ENABLE ROW LEVEL SECURITY;

-- 所有認證用戶可讀
DROP POLICY IF EXISTS "tour_leaders_select" ON public.tour_leaders;
CREATE POLICY "tour_leaders_select" ON public.tour_leaders
  FOR SELECT TO authenticated USING (true);

-- 所有認證用戶可寫
DROP POLICY IF EXISTS "tour_leaders_insert" ON public.tour_leaders;
CREATE POLICY "tour_leaders_insert" ON public.tour_leaders
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tour_leaders_update" ON public.tour_leaders;
CREATE POLICY "tour_leaders_update" ON public.tour_leaders
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tour_leaders_delete" ON public.tour_leaders;
CREATE POLICY "tour_leaders_delete" ON public.tour_leaders
  FOR DELETE TO authenticated USING (true);

-- 4. 更新時間戳觸發器
CREATE OR REPLACE TRIGGER update_tour_leaders_updated_at
  BEFORE UPDATE ON public.tour_leaders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. 註解
COMMENT ON TABLE public.tour_leaders IS '領隊資料表 - 記錄外部合作領隊資訊';
COMMENT ON COLUMN public.tour_leaders.code IS '領隊編號（如 TL001）';
COMMENT ON COLUMN public.tour_leaders.languages IS '語言能力（陣列）';
COMMENT ON COLUMN public.tour_leaders.specialties IS '專長地區/路線（陣列）';
COMMENT ON COLUMN public.tour_leaders.license_number IS '領隊證號碼';
COMMENT ON COLUMN public.tour_leaders.status IS '狀態：active/inactive';

COMMIT;
