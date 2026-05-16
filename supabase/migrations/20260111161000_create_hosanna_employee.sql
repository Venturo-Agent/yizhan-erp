-- 建立以琳通運公司第一位員工：老闆娘
-- 密碼: 00000000

BEGIN;

DO $$
DECLARE
  ws_id uuid;
  emp_id uuid;
BEGIN
  -- 1. 取得 workspace ID
  SELECT id INTO ws_id FROM public.workspaces WHERE code = 'HS';
  
  IF ws_id IS NULL THEN
    RAISE EXCEPTION 'Workspace HS not found';
  END IF;

  -- 2. 檢查是否已有員工
  IF EXISTS (SELECT 1 FROM public.employees WHERE workspace_id = ws_id AND employee_number = 'E001') THEN
    RAISE NOTICE 'Employee E001 already exists for HS workspace, skipping';
  ELSE
    -- 3. 建立員工
    emp_id := gen_random_uuid();
    INSERT INTO public.employees (
      id,
      employee_number,
      chinese_name,
      display_name,
      password_hash,
      workspace_id,
      roles,
      permissions,
      is_active,
      status,
      created_at
    ) VALUES (
      emp_id,
      'E001',
      '老闆娘',
      '老闆娘',
      '$2b$12$S86uKN.kJMIYnGLh750MPezkpAVEFL9TYibMGIF9soKc8moR.ML/2',
      ws_id,
      ARRAY['admin'],
      ARRAY['*'],
      true,
      'active',
      now()
    );
    RAISE NOTICE 'Created employee E001 (老闆娘) for 以琳通運公司';
    RAISE NOTICE 'Login: Employee number = E001, Password = 00000000';
  END IF;
END $$;

COMMIT;
