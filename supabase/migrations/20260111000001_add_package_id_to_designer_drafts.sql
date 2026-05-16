-- 為 designer_drafts 添加 package_id 欄位
BEGIN;

-- 添加 package_id 欄位
ALTER TABLE public.designer_drafts
ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.proposal_packages(id) ON DELETE CASCADE;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_designer_drafts_package ON public.designer_drafts(package_id);

-- 每個套件只能有一個草稿（UNIQUE constraint）
CREATE UNIQUE INDEX IF NOT EXISTS idx_designer_drafts_package_unique ON public.designer_drafts(package_id) WHERE package_id IS NOT NULL;

COMMIT;
