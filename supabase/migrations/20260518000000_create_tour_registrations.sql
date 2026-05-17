-- ════════════════════════════════════════════════════════════════════════════
-- 建立 tour_registrations table
-- 
-- 功能：讓客戶透過公開連結報名旅遊團
-- 安全性：
--   - RLS: 公開寫入、業務可讀取、系統可管理
--   - 護照資料建議在 Supabase Vault 中加密
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 建立 table
CREATE TABLE public.tour_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  sales_ref_code TEXT, -- 業務 attribution code（不暴露 employee id）
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  passenger_count INTEGER DEFAULT 1 CHECK (passenger_count >= 1),
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tour_id lookups
CREATE INDEX idx_tour_registrations_tour_id ON public.tour_registrations(tour_id);

-- Index for sales ref code lookups  
CREATE INDEX idx_tour_registrations_sales_ref ON public.tour_registrations(sales_ref_code);

-- Index for status filtering
CREATE INDEX idx_tour_registrations_status ON public.tour_registrations(status);

-- RLS: 公開可以 insert、業務可以讀取自己的 sales_ref_code
ALTER TABLE public.tour_registrations ENABLE ROW LEVEL SECURITY;

-- 公開寫入（提交報名）
CREATE POLICY "Anyone can submit registration"
  ON public.tour_registrations FOR INSERT
  TO anon, authenticated
  USING (true);

-- 業務可以讀取包含自己 sales_ref_code 的報名（需搭配 service role key）
CREATE POLICY "Service role can read all registrations"
  ON public.tour_registrations FOR SELECT
  TO service_role
  USING (true);

-- 業務只能讀取自己 sales_ref_code 的報名（authenticated users）
-- 注意：需要 workspace 應用層過濾 sales_ref_code 對應的 employee
CREATE POLICY "Users can read registrations by sales_ref"
  ON public.tour_registrations FOR SELECT
  TO authenticated
  USING (
    sales_ref_code IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.sales_ref_code = tour_registrations.sales_ref_code
    )
  );

-- 系統可以更新 status
CREATE POLICY "Service role can update registration status"
  ON public.tour_registrations FOR UPDATE
  TO service_role
  USING (true);

COMMIT;

-- ════ Rollback ════
-- DROP TABLE public.tour_registrations;
