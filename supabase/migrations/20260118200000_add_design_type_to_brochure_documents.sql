-- ============================================
-- 為 brochure_documents 新增設計類型和快取欄位
-- ============================================
-- 目的：支援設計模組獨立管理，區分不同設計類型

BEGIN;

-- 新增設計類型欄位
ALTER TABLE public.brochure_documents
ADD COLUMN IF NOT EXISTS design_type TEXT DEFAULT 'brochure_a4';

-- 新增快取欄位（方便列表顯示，避免 JOIN）
ALTER TABLE public.brochure_documents
ADD COLUMN IF NOT EXISTS tour_code TEXT,
ADD COLUMN IF NOT EXISTS tour_name TEXT,
ADD COLUMN IF NOT EXISTS itinerary_name TEXT;

-- 新增狀態欄位
ALTER TABLE public.brochure_documents
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- 為設計類型建立索引
CREATE INDEX IF NOT EXISTS idx_brochure_documents_design_type ON public.brochure_documents(design_type);
CREATE INDEX IF NOT EXISTS idx_brochure_documents_status ON public.brochure_documents(status);

-- 更新備註
COMMENT ON COLUMN public.brochure_documents.design_type IS '設計類型: brochure_a4, brochure_square, web_itinerary, banner';
COMMENT ON COLUMN public.brochure_documents.tour_code IS '快取：旅遊團代碼';
COMMENT ON COLUMN public.brochure_documents.tour_name IS '快取：旅遊團名稱';
COMMENT ON COLUMN public.brochure_documents.itinerary_name IS '快取：行程表名稱';
COMMENT ON COLUMN public.brochure_documents.status IS '設計狀態: draft, completed';

COMMIT;
