-- 修正：chart_of_accounts 的 account_type 約束加上 'equity'
-- 原本：('asset', 'liability', 'revenue', 'expense', 'cost')
-- 修正後：('asset', 'liability', 'equity', 'revenue', 'expense', 'cost')


-- 刪除舊的 CHECK 約束
ALTER TABLE public.chart_of_accounts
DROP CONSTRAINT IF EXISTS chart_of_accounts_account_type_check;

-- 建立新的 CHECK 約束（加上 equity）
ALTER TABLE public.chart_of_accounts
ADD CONSTRAINT chart_of_accounts_account_type_check
CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'cost'));

