-- Create USA ESTA (Electronic System for Travel Authorization) table
BEGIN;

-- ============================================================================
-- Create usa_esta table for US ESTA visa applications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usa_esta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 關聯資料
  tour_id TEXT REFERENCES public.tours(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,

  -- 申請編號
  application_code TEXT NOT NULL, -- ESTA 申請編號

  -- ==================== 申請人基本資料 ====================
  applicant_name_zh TEXT NOT NULL, -- 申請人中文姓名

  -- 護照效期檢查
  passport_validity_over_2_years BOOLEAN NOT NULL, -- 護照效期是否為兩年以上

  -- 出生資訊
  birth_city TEXT, -- 出生城市
  birth_country TEXT, -- 出生國家

  -- 其他國籍
  has_other_citizenship BOOLEAN DEFAULT false, -- 是否為其他國家公民
  other_citizenship_country TEXT, -- 其他公民身分國家
  other_citizenship_method TEXT, -- 取得方式：出生、父母、歸化、其他
  other_citizenship_method_detail TEXT, -- 其他方式說明

  -- 曾經的其他國籍
  had_other_citizenship BOOLEAN DEFAULT false, -- 曾經是否為其他國家公民
  had_other_citizenship_country TEXT, -- 曾經公民身分國家
  had_citizenship_acquired_date DATE, -- 成為公民時間
  had_citizenship_renounced_date DATE, -- 放棄公民時間

  -- 其他姓名/別名
  has_other_names BOOLEAN DEFAULT false, -- 是否有其他姓名或別名
  other_name_surname_zh TEXT, -- 別名中文姓氏
  other_name_surname_en TEXT, -- 別名英文姓氏
  other_name_firstname_zh TEXT, -- 別名中文名字
  other_name_firstname_en TEXT, -- 別名英文名字

  -- 其他國家護照或身分證
  has_other_passport_or_id BOOLEAN DEFAULT false, -- 是否曾持有其他國家護照或身分證
  other_document_type TEXT, -- 證件類型：護照、身分證
  other_document_country TEXT, -- 簽發國家
  other_document_number TEXT, -- 證件號碼
  other_document_expiry_year INTEGER, -- 證件效期截止年份

  -- 聯絡資訊
  contact_address_zh TEXT, -- 中文連絡地址
  contact_address_en TEXT, -- 英文連絡地址
  contact_phone TEXT, -- 連絡電話號碼

  -- 社群媒體資訊
  provides_social_media BOOLEAN DEFAULT false, -- 是否提供社群媒體資訊
  no_social_media BOOLEAN DEFAULT false, -- 是否沒有社群媒體
  social_media_platform_1 TEXT, -- 社群媒體平台 1
  social_media_id_1 TEXT, -- 社群媒體識別碼 1
  social_media_platform_2 TEXT, -- 社群媒體平台 2
  social_media_id_2 TEXT, -- 社群媒體識別碼 2

  -- CBP Global Entry
  is_cbp_global_entry_member BOOLEAN DEFAULT false, -- 是否為 CBP GLOBAL ENTRY 會員
  cbp_membership_number TEXT, -- 會員號碼

  -- 父母資訊
  father_surname_zh TEXT, -- 父親中文姓氏
  father_surname_en TEXT, -- 父親英文姓氏
  father_firstname_zh TEXT, -- 父親中文名字
  father_firstname_en TEXT, -- 父親英文名字
  mother_surname_zh TEXT, -- 母親中文姓氏
  mother_surname_en TEXT, -- 母親英文姓氏
  mother_firstname_zh TEXT, -- 母親中文名字
  mother_firstname_en TEXT, -- 母親英文名字

  -- ==================== 就業資訊 ====================
  job_title_zh TEXT, -- 職稱中文
  job_title_en TEXT, -- 職稱英文
  employment_status TEXT, -- 待業、學齡前兒童、家庭主婦、退休
  company_name_zh TEXT, -- 公司或學校中文名字
  company_name_en TEXT, -- 公司或學校英文名字
  company_address_zh TEXT, -- 公司或學校中文地址
  company_address_en TEXT, -- 公司或學校英文地址
  company_phone TEXT, -- 公司或學校電話

  -- ==================== 旅遊資訊 ====================
  is_transit_to_another_country BOOLEAN DEFAULT false, -- 是否因過境到另一個國家
  transit_destination_country TEXT, -- 目的國

  -- 美國聯絡人或飯店資訊
  us_contact_name_en TEXT, -- 美國聯絡人或飯店英文名字
  us_contact_address_en TEXT, -- 美國聯絡人或飯店英文地址
  us_contact_city_en TEXT, -- 英文城市
  us_contact_state_en TEXT, -- 英文州別
  us_contact_phone TEXT, -- 美國聯絡人或飯店電話

  -- 在美期間地址
  us_stay_address_en TEXT, -- 在美期間英文地址
  us_stay_city_en TEXT, -- 英文城市
  us_stay_state_en TEXT, -- 英文州別

  -- ==================== 緊急聯絡人資訊 ====================
  emergency_contact_surname_zh TEXT, -- 緊急聯絡人中文姓氏
  emergency_contact_surname_en TEXT, -- 緊急聯絡人英文姓氏
  emergency_contact_firstname_zh TEXT, -- 緊急聯絡人中文名字
  emergency_contact_firstname_en TEXT, -- 緊急聯絡人英文名字
  emergency_contact_country_code TEXT, -- 國碼
  emergency_contact_phone TEXT, -- 電話號碼
  emergency_contact_email TEXT, -- 電子郵件地址

  -- ==================== 符合資格問題（9 個問題）====================
  -- Q1: 健康問題
  q1_has_health_issues BOOLEAN DEFAULT false, -- 是否患有身體或心理障礙或傳染病

  -- Q2: 犯罪記錄
  q2_has_criminal_record BOOLEAN DEFAULT false, -- 是否曾因嚴重犯罪被逮捕或定罪

  -- Q3: 毒品相關
  q3_has_drug_violation BOOLEAN DEFAULT false, -- 是否曾違反毒品法律

  -- Q4: 恐怖活動
  q4_involved_in_terrorism BOOLEAN DEFAULT false, -- 是否涉及恐怖、間諜等活動

  -- Q5: 詐欺
  q5_committed_fraud BOOLEAN DEFAULT false, -- 是否曾犯詐欺取得簽證

  -- Q6: 非法就業
  q6_illegal_employment BOOLEAN DEFAULT false, -- 是否未經許可在美工作

  -- Q7: 簽證拒簽記錄
  q7_visa_denied BOOLEAN DEFAULT false, -- 是否曾被拒簽或拒絕入境
  q7_denied_when TEXT, -- 何時被拒絕
  q7_denied_where TEXT, -- 何處被拒絕

  -- Q8: 逾期停留
  q8_overstayed BOOLEAN DEFAULT false, -- 是否曾在美逾期停留

  -- Q9: 特定國家旅遊記錄
  q9_visited_restricted_countries BOOLEAN DEFAULT false, -- 2011/3/1後是否曾前往特定國家
  q9_countries_visited TEXT[], -- 曾前往國家清單（陣列）
  q9_visit_start_year INTEGER, -- 停留開始年份
  q9_visit_start_month INTEGER, -- 停留開始月份
  q9_visit_end_year INTEGER, -- 停留結束年份
  q9_visit_end_month INTEGER, -- 停留結束月份
  q9_visit_purpose TEXT, -- 主要目的
  q9_visit_purpose_detail TEXT, -- 其他目的說明

  -- ==================== 申請狀態 ====================
  status TEXT DEFAULT 'draft', -- draft, submitted, approved, denied
  application_number TEXT, -- ESTA 申請號碼（核准後）
  esta_validity_start DATE, -- ESTA 有效期開始日
  esta_validity_end DATE, -- ESTA 有效期結束日

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,

  -- Soft delete
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  deleted_by UUID REFERENCES public.employees(id) ON DELETE SET NULL
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_usa_esta_workspace ON public.usa_esta(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_usa_esta_tour ON public.usa_esta(tour_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_usa_esta_order ON public.usa_esta(order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_usa_esta_customer ON public.usa_esta(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_usa_esta_status ON public.usa_esta(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_usa_esta_applicant_name ON public.usa_esta(applicant_name_zh) WHERE deleted_at IS NULL;

-- ============================================================================
-- Disable RLS (根據專案規範)
-- ============================================================================
ALTER TABLE public.usa_esta DISABLE ROW LEVEL SECURITY;

-- 刪除舊的 RLS Policies（如果存在）
DROP POLICY IF EXISTS "Users can view their workspace usa_esta" ON public.usa_esta;
DROP POLICY IF EXISTS "Users can insert their workspace usa_esta" ON public.usa_esta;
DROP POLICY IF EXISTS "Users can update their workspace usa_esta" ON public.usa_esta;
DROP POLICY IF EXISTS "Users can delete their workspace usa_esta" ON public.usa_esta;

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS set_usa_esta_updated_at ON public.usa_esta;
CREATE TRIGGER set_usa_esta_updated_at
  BEFORE UPDATE ON public.usa_esta
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE public.usa_esta IS 'USA ESTA (Electronic System for Travel Authorization) visa applications';
COMMENT ON COLUMN public.usa_esta.application_code IS 'Internal ESTA application reference code';
COMMENT ON COLUMN public.usa_esta.passport_validity_over_2_years IS 'Whether passport is valid for more than 2 years (affects ESTA validity)';
COMMENT ON COLUMN public.usa_esta.q9_countries_visited IS 'Array of countries visited after 2011/3/1: Iran, Iraq, Libya, North Korea, Somalia, Sudan, Syria, Yemen, Cuba';

COMMIT;
