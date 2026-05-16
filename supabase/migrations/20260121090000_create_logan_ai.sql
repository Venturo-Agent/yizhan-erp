-- =============================================
-- Logan AI 員工記錄
-- 2026-01-21
-- 資料表已在 20260121000000_create_ai_memories.sql 建立
-- =============================================

-- 建立 Logan Bot 員工記錄（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE employee_number = 'LOGAN') THEN
    INSERT INTO public.employees (
      id,
      employee_number,
      display_name,
      chinese_name,
      english_name,
      email,
      employee_type,
      roles,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000002',
      'LOGAN',
      'Logan AI',
      '羅根',
      'Logan',
      'logan@venturo.ai',
      'bot',
      ARRAY['bot'],
      true,
      now(),
      now()
    );
  END IF;
END $$;
