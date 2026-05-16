-- 為 tour_requests 加入 proposal_package_id 欄位
-- 讓提案階段也能建立需求單，開團後自動帶入

BEGIN;

-- 1. 加入 proposal_package_id 欄位
ALTER TABLE public.tour_requests
ADD COLUMN IF NOT EXISTS proposal_package_id uuid REFERENCES public.proposal_packages(id) ON DELETE SET NULL;

-- 2. 讓 tour_id 變成可選（提案階段沒有 tour）
ALTER TABLE public.tour_requests
ALTER COLUMN tour_id DROP NOT NULL;

-- 3. 加入索引
CREATE INDEX IF NOT EXISTS idx_tour_requests_proposal_package_id
ON public.tour_requests(proposal_package_id);

-- 4. 加入註解
COMMENT ON COLUMN public.tour_requests.proposal_package_id IS '關聯的提案套件 ID（提案階段使用）';

COMMIT;
