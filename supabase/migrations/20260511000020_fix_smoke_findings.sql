-- Smoke test 修補：補 column / FK / capability
-- bank_accounts.bank_code、payment_methods → chart_of_accounts FK、selector_field_roles FK
-- 系統主管角色補 tours.contract.* capability

BEGIN;

-- 1. bank_accounts.bank_code
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS bank_code text;

-- 2. payment_methods → chart_of_accounts FKs (PostgREST relationship hint 必要)
DO $$ BEGIN
  ALTER TABLE public.payment_methods
    ADD CONSTRAINT payment_methods_debit_account_id_fkey
    FOREIGN KEY (debit_account_id) REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.payment_methods
    ADD CONSTRAINT payment_methods_credit_account_id_fkey
    FOREIGN KEY (credit_account_id) REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.payment_methods
    ADD CONSTRAINT payment_methods_fee_account_id_fkey
    FOREIGN KEY (fee_account_id) REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. selector_field_roles FKs
DO $$ BEGIN
  ALTER TABLE public.selector_field_roles
    ADD CONSTRAINT selector_field_roles_field_id_fkey
    FOREIGN KEY (field_id) REFERENCES public.workspace_selector_fields(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.selector_field_roles
    ADD CONSTRAINT selector_field_roles_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES public.workspace_roles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. 系統主管 capabilities 補 tours.contract.*
INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
SELECT '7829922c-dcdf-4d31-871a-d8780b8cfc52'::uuid, cap, true
FROM (VALUES
  ('tours.contract.read'),
  ('tours.contract.write'),
  ('finance.requests.read'),
  ('finance.requests.write'),
  ('finance.payments.read'),
  ('finance.payments.write'),
  ('accounting.read'),
  ('accounting.write'),
  ('library.customers.read'),
  ('library.customers.write'),
  ('library.suppliers.read'),
  ('library.suppliers.write')
) AS x(cap)
ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;

-- Refresh PostgREST schema cache (post-FK changes)
NOTIFY pgrst, 'reload schema';

COMMIT;
