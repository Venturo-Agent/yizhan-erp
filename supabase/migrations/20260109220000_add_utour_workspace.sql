-- 新增勁陽旅行社 workspace

BEGIN;

-- 先檢查是否已存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE code = 'UTOUR') THEN
    INSERT INTO public.workspaces (code, name, is_active, created_at)
    VALUES ('UTOUR', '勁陽旅行社', true, now());
  END IF;
END $$;

COMMIT;
