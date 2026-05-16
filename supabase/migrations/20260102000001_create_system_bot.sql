-- 建立系統機器人帳號
-- 用於發送系統通知、金額異常提醒等

BEGIN;

-- 檢查是否已存在系統機器人
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM employees WHERE employee_number = 'BOT001') THEN
    -- 建立系統機器人帳號（台北辦公室）
    INSERT INTO employees (
      id,
      employee_number,
      english_name,
      display_name,
      chinese_name,
      personal_info,
      job_info,
      salary_info,
      permissions,
      roles,
      attendance,
      contracts,
      status,
      avatar,
      workspace_id,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      'BOT001',
      'Corner Bot',
      '角落機器人',
      '角落機器人',
      '{"national_id": "", "birthday": "", "phone": "", "email": "bot@venturo.com.tw", "address": "", "emergency_contact": {"name": "", "relationship": "", "phone": ""}}'::jsonb,
      '{"position": "系統機器人", "hire_date": "2024-01-01"}'::jsonb,
      '{"base_salary": 0, "allowances": [], "salary_history": []}'::jsonb,
      ARRAY[]::text[],
      ARRAY['bot']::text[],
      '{"leave_records": [], "overtime_records": []}'::jsonb,
      '[]'::jsonb,
      'active',
      NULL,
      (SELECT id FROM workspaces WHERE code = 'TP' LIMIT 1),
      NOW(),
      NOW()
    );

    RAISE NOTICE '系統機器人帳號已建立';
  ELSE
    RAISE NOTICE '系統機器人帳號已存在，跳過建立';
  END IF;
END $$;

COMMIT;
