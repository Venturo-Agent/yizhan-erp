-- 統一 gender 格式為 M/F（與 order_members 一致）

BEGIN;

-- 1. 先更新現有資料
UPDATE public.customers
SET gender = CASE
  WHEN gender = 'male' THEN 'M'
  WHEN gender = 'female' THEN 'F'
  WHEN gender = 'other' THEN ''
  ELSE gender
END
WHERE gender IN ('male', 'female', 'other');

-- 2. 刪除舊的 constraint
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_gender_check;

-- 3. 新增新的 constraint（M/F/空字串/null）
ALTER TABLE public.customers
ADD CONSTRAINT customers_gender_check
CHECK (gender IS NULL OR gender IN ('M', 'F', ''));

COMMIT;
