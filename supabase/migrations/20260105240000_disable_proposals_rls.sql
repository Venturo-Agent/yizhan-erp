-- 禁用 proposals 和 proposal_packages 的 RLS（單一租戶模式）
-- 與其他業務表格保持一致

BEGIN;

-- 禁用 proposals RLS
ALTER TABLE IF EXISTS public.proposals DISABLE ROW LEVEL SECURITY;

-- 禁用 proposal_packages RLS
ALTER TABLE IF EXISTS public.proposal_packages DISABLE ROW LEVEL SECURITY;

COMMIT;
