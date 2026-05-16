-- 建立 JY 公司和第一位員工
-- 統編/預設密碼: 27731697

BEGIN;

DO $$
DECLARE
  ws_id uuid;
  existing_ws_id uuid;
  emp_id uuid;
  next_emp_num text;
  emp_count integer;
BEGIN
  -- 1. 檢查是否已存在 workspace
  SELECT id INTO existing_ws_id FROM public.workspaces WHERE code = 'JY';

  IF existing_ws_id IS NOT NULL THEN
    ws_id := existing_ws_id;
    RAISE NOTICE 'Workspace JY already exists: %', ws_id;
  ELSE
    -- 建立新 workspace
    ws_id := gen_random_uuid();
    INSERT INTO public.workspaces (id, code, name, is_active, created_at)
    VALUES (ws_id, 'JY', 'JY 旅行社', true, now());
    RAISE NOTICE 'Created workspace JY: %', ws_id;
  END IF;

  -- 2. 檢查 JY 是否已有員工
  SELECT COUNT(*) INTO emp_count FROM public.employees WHERE workspace_id = ws_id;

  IF emp_count > 0 THEN
    RAISE NOTICE 'JY workspace already has % employees, skipping creation', emp_count;
  ELSE
    -- 3. 找下一個可用的員工編號
    emp_count := 0;
    LOOP
      emp_count := emp_count + 1;
      next_emp_num := 'E' || LPAD(emp_count::text, 3, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.employees WHERE employee_number = next_emp_num);
      -- 安全限制：最多嘗試到 E999
      IF emp_count >= 999 THEN
        RAISE EXCEPTION 'Cannot find available employee number';
      END IF;
    END LOOP;

    -- 4. 建立員工
    emp_id := gen_random_uuid();
    INSERT INTO public.employees (
      id,
      employee_number,
      chinese_name,
      english_name,
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
      next_emp_num,
      '張文林',
      'ERIC',
      '張文林',
      '$2b$12$KjkkaZxvAM/bgWGmqh3sKelXoMPNurN6CqwokidhlK29z74Ugv5Hq',
      ws_id,
      ARRAY['admin'],
      ARRAY['*'],
      true,
      'active',
      now()
    );
    RAISE NOTICE 'Created employee % (張文林/ERIC) for JY workspace', next_emp_num;
    RAISE NOTICE 'Login: Employee number = %, Password = 27731697', next_emp_num;
  END IF;
END $$;

COMMIT;
