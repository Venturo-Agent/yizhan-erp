-- 設定大小章、發票章為僅限會計/管理者可見

UPDATE public.company_assets
SET restricted = true
WHERE name IN ('大章', '小章', '發票章');
