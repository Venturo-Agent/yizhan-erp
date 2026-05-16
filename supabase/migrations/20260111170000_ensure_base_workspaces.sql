-- 確保基礎 workspace 存在
-- 解決找不到 corner/TP 的問題

BEGIN;

-- 先為 code 欄位加上 UNIQUE 約束（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_code_key'
  ) THEN
    ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_code_key UNIQUE (code);
  END IF;
END $$;

-- 台北 (corner)
INSERT INTO public.workspaces (name, code, type, is_active, created_at, updated_at)
VALUES ('角落旅遊 台北', 'corner', 'travel_agency', true, now(), now())
ON CONFLICT (code) DO UPDATE SET name = '角落旅遊 台北', is_active = true;

-- 台中 (cornertc)
INSERT INTO public.workspaces (name, code, type, is_active, created_at, updated_at)
VALUES ('角落旅遊 台中', 'cornertc', 'travel_agency', true, now(), now())
ON CONFLICT (code) DO UPDATE SET name = '角落旅遊 台中', is_active = true;

-- 勁揚 (utour)
INSERT INTO public.workspaces (name, code, type, is_active, created_at, updated_at)
VALUES ('勁揚旅遊', 'utour', 'travel_agency', true, now(), now())
ON CONFLICT (code) DO UPDATE SET name = '勁揚旅遊', is_active = true;

-- 和撒那 (hosanna)
INSERT INTO public.workspaces (name, code, type, is_active, created_at, updated_at)
VALUES ('和撒那旅遊', 'hosanna', 'travel_agency', true, now(), now())
ON CONFLICT (code) DO UPDATE SET name = '和撒那旅遊', is_active = true;

-- 清理 suppliers 表中可能重複的 CORNER（如果存在）
DELETE FROM public.suppliers WHERE UPPER(code) = 'CORNER';

COMMIT;
