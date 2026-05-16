-- 建立以琳通運公司 Workspace
BEGIN;

INSERT INTO public.workspaces (id, name, code, type, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '以琳通運公司',
  'HS',
  'vehicle_supplier',
  now(),
  now()
)
ON CONFLICT (code) DO NOTHING;

COMMIT;
