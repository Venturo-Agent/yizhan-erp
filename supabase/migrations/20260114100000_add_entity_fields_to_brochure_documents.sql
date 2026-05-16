-- ============================================
-- 為 brochure_documents 新增 package_id 和 itinerary_id 欄位
-- ============================================
-- 目的：支援從不同來源（旅遊團、提案套餐、行程表）建立手冊

BEGIN;

-- 新增欄位
ALTER TABLE public.brochure_documents
ADD COLUMN IF NOT EXISTS package_id UUID,
ADD COLUMN IF NOT EXISTS itinerary_id UUID;

-- 為新欄位建立索引
CREATE INDEX IF NOT EXISTS idx_brochure_documents_package_id ON public.brochure_documents(package_id);
CREATE INDEX IF NOT EXISTS idx_brochure_documents_itinerary_id ON public.brochure_documents(itinerary_id);

-- 更新備註
COMMENT ON COLUMN public.brochure_documents.tour_id IS '關聯的旅遊團 ID（開團後）';
COMMENT ON COLUMN public.brochure_documents.package_id IS '關聯的提案套餐 ID（提案階段）';
COMMENT ON COLUMN public.brochure_documents.itinerary_id IS '關聯的行程表 ID';

COMMIT;
