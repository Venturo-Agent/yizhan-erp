-- =====================================================
-- Companies Module — 憲法合規修齊
-- =====================================================
-- 對齊 docs/VENTURO_ERP_STANDARDS.md
--   Section 2: 業務表必要欄位 + index + trigger + RLS
--   Section 4: 軟刪除統一 is_active
--   Section 10.6: 不准 is_deleted / deleted_at（包含 _deleted）
--   Section 10.11: audit FK 必指 employees(id)
--   Section 1: 命名一致（沿用 UI 已實作欄位、UI 是用戶可見契約）
--
-- 三張表：companies / company_contacts / company_announcements
--
-- 現況問題（DB 跟 UI 嚴重不一致、UI 早就壞了、insert 必炸）：
--   1. DB 有 _needs_sync / _synced_at / _deleted 三套 sync 殘留
--   2. DB 用 name / english_name / industry / employee_count / is_vip /
--      annual_travel_budget / total_orders / total_spent / last_order_date
--      / status / fax / address / website / code 等 CRM 風格欄位
--   3. UI 用 company_name / invoice_title / invoice_address / invoice_email /
--      payment_method / bank_name / bank_account / bank_branch /
--      registered_address / mailing_address 等 B2B 發票/銀行欄位
--   4. workspace_id 沒 NOT NULL（憲法要 NOT NULL + ON DELETE CASCADE）
--   5. company_contacts.is_active 是 nullable（憲法要 NOT NULL DEFAULT true）
--   6. company_announcements 沒 is_active
--   7. created_by / updated_by 沒 FK
--   8. 三張表都沒 updated_at trigger
--
-- 策略：
--   業務面 William 拍板「保留」、現況 0 row、所以以 UI 為 SSOT、
--   把 DB schema 校齊到 UI 已實作的 B2B 企業客戶模型。
--   砍掉沒 UI 對應的舊 CRM-style 欄位，避免長期保留腐肉。
-- =====================================================

BEGIN;

-- =====================================================
-- A) companies 主表
-- =====================================================

-- A.1) 砍 sync 欄位殘留
ALTER TABLE public.companies DROP COLUMN IF EXISTS _needs_sync;
ALTER TABLE public.companies DROP COLUMN IF EXISTS _synced_at;
ALTER TABLE public.companies DROP COLUMN IF EXISTS _deleted;

-- A.2) 砍掉沒 UI 對應的 legacy 欄位
ALTER TABLE public.companies DROP COLUMN IF EXISTS code;
ALTER TABLE public.companies DROP COLUMN IF EXISTS english_name;
ALTER TABLE public.companies DROP COLUMN IF EXISTS fax;
ALTER TABLE public.companies DROP COLUMN IF EXISTS address;
ALTER TABLE public.companies DROP COLUMN IF EXISTS industry;
ALTER TABLE public.companies DROP COLUMN IF EXISTS employee_count;
ALTER TABLE public.companies DROP COLUMN IF EXISTS annual_travel_budget;
ALTER TABLE public.companies DROP COLUMN IF EXISTS status;
ALTER TABLE public.companies DROP COLUMN IF EXISTS is_vip;
ALTER TABLE public.companies DROP COLUMN IF EXISTS total_orders;
ALTER TABLE public.companies DROP COLUMN IF EXISTS total_spent;
ALTER TABLE public.companies DROP COLUMN IF EXISTS last_order_date;

-- A.3) 重命名 name → company_name（UI 已用 company_name、語意更清楚、避免跟 customers.name 混淆）
ALTER TABLE public.companies RENAME COLUMN name TO company_name;

-- A.4) 加上 UI 需要的欄位
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS invoice_title text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS invoice_address text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS invoice_email text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'transfer';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bank_account text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bank_branch text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS registered_address text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS mailing_address text;

-- A.5) payment_method 加 CHECK constraint
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_payment_method_check;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_payment_method_check
  CHECK (payment_method IN ('transfer', 'cash', 'check', 'credit_card'));

-- A.6) payment_terms 由 text 改 integer（UI 用數字天數）
-- 0 row 可以直接 USING NULL 轉
ALTER TABLE public.companies
  ALTER COLUMN payment_terms TYPE integer USING NULL,
  ALTER COLUMN payment_terms SET DEFAULT 30;

-- A.7) credit_limit 預設 0
ALTER TABLE public.companies
  ALTER COLUMN credit_limit SET DEFAULT 0;

-- A.8) vip_level 預設 0、NOT NULL（UI 要求 number、不允許 null）
UPDATE public.companies SET vip_level = 0 WHERE vip_level IS NULL;
ALTER TABLE public.companies
  ALTER COLUMN vip_level SET DEFAULT 0,
  ALTER COLUMN vip_level SET NOT NULL;

-- A.9) workspace_id NOT NULL + ON DELETE CASCADE
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_workspace_id_fkey;
ALTER TABLE public.companies
  ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- A.10) created_at / updated_at NOT NULL
UPDATE public.companies SET created_at = now() WHERE created_at IS NULL;
UPDATE public.companies SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.companies
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.companies
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- A.11) is_active 軟刪除（憲法 Section 4）
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
UPDATE public.companies SET is_active = true WHERE is_active IS NULL;
ALTER TABLE public.companies
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL;

-- A.12) audit FK
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_created_by_fkey;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_updated_by_fkey;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

-- A.13) updated_at trigger
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- B) company_contacts 表
-- =====================================================

-- B.1) 砍 sync 欄位殘留
ALTER TABLE public.company_contacts DROP COLUMN IF EXISTS _needs_sync;
ALTER TABLE public.company_contacts DROP COLUMN IF EXISTS _synced_at;
ALTER TABLE public.company_contacts DROP COLUMN IF EXISTS _deleted;

-- B.2) workspace_id NOT NULL + ON DELETE CASCADE
ALTER TABLE public.company_contacts DROP CONSTRAINT IF EXISTS company_contacts_workspace_id_fkey;
ALTER TABLE public.company_contacts
  ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.company_contacts
  ADD CONSTRAINT company_contacts_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- B.3) is_active NOT NULL DEFAULT true
UPDATE public.company_contacts SET is_active = true WHERE is_active IS NULL;
ALTER TABLE public.company_contacts
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL;

-- B.4) created_at / updated_at NOT NULL
UPDATE public.company_contacts SET created_at = now() WHERE created_at IS NULL;
UPDATE public.company_contacts SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.company_contacts
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.company_contacts
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- B.5) audit FK
ALTER TABLE public.company_contacts DROP CONSTRAINT IF EXISTS company_contacts_created_by_fkey;
ALTER TABLE public.company_contacts
  ADD CONSTRAINT company_contacts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.company_contacts DROP CONSTRAINT IF EXISTS company_contacts_updated_by_fkey;
ALTER TABLE public.company_contacts
  ADD CONSTRAINT company_contacts_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

-- B.6) workspace_id index（憲法 Section 2 必要）
CREATE INDEX IF NOT EXISTS idx_company_contacts_workspace_id
  ON public.company_contacts (workspace_id);

-- B.7) updated_at trigger
DROP TRIGGER IF EXISTS update_company_contacts_updated_at ON public.company_contacts;
CREATE TRIGGER update_company_contacts_updated_at
  BEFORE UPDATE ON public.company_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- C) company_announcements 表
-- =====================================================

-- C.1) 砍 sync 欄位殘留
ALTER TABLE public.company_announcements DROP COLUMN IF EXISTS _needs_sync;
ALTER TABLE public.company_announcements DROP COLUMN IF EXISTS _synced_at;
ALTER TABLE public.company_announcements DROP COLUMN IF EXISTS _deleted;

-- C.2) workspace_id NOT NULL + ON DELETE CASCADE
ALTER TABLE public.company_announcements DROP CONSTRAINT IF EXISTS company_announcements_workspace_id_fkey;
ALTER TABLE public.company_announcements
  ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.company_announcements
  ADD CONSTRAINT company_announcements_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- C.3) is_active 軟刪除（憲法 Section 4）
ALTER TABLE public.company_announcements
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
UPDATE public.company_announcements SET is_active = true WHERE is_active IS NULL;
ALTER TABLE public.company_announcements
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL;

-- C.4) created_at / updated_at NOT NULL
UPDATE public.company_announcements SET created_at = now() WHERE created_at IS NULL;
UPDATE public.company_announcements SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE public.company_announcements
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.company_announcements
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- C.5) audit FK
ALTER TABLE public.company_announcements DROP CONSTRAINT IF EXISTS company_announcements_created_by_fkey;
ALTER TABLE public.company_announcements
  ADD CONSTRAINT company_announcements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.company_announcements DROP CONSTRAINT IF EXISTS company_announcements_updated_by_fkey;
ALTER TABLE public.company_announcements
  ADD CONSTRAINT company_announcements_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

-- C.6) updated_at trigger
DROP TRIGGER IF EXISTS update_company_announcements_updated_at ON public.company_announcements;
CREATE TRIGGER update_company_announcements_updated_at
  BEFORE UPDATE ON public.company_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

-- =====================================================
-- 寫入 schema_migrations
-- =====================================================
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20260502190000', 'companies_compliance', NULL)
ON CONFLICT (version) DO NOTHING;
