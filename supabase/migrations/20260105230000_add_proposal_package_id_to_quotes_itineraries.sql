-- 為 quotes 和 itineraries 表格新增 proposal_package_id 欄位
-- 用於關聯提案套件

BEGIN;

-- quotes 表格新增 proposal_package_id
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS proposal_package_id uuid REFERENCES public.proposal_packages(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.quotes.proposal_package_id IS '關聯的提案套件 ID';

-- itineraries 表格新增 proposal_package_id
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS proposal_package_id uuid REFERENCES public.proposal_packages(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.itineraries.proposal_package_id IS '關聯的提案套件 ID';

COMMIT;
