-- ================================================================
-- Migration: Employee Capabilities System (Phase 1)
-- ================================================================
-- Blueprint: docs/blueprints/16-hr-roles.md (ADR-R5 待補)
-- Decided by William on 2026-04-18「遊戲比喻：種族=Capabilities、職業=Role」
-- Design: 3 層架構
--   Layer 1 Role (職務/職業) → 權限（workspace_roles + role_tab_permissions、不動）
--   Layer 2 Capabilities (能力/種族) → 員工 boolean flag（本 migration 建）
--   Layer 3 Data Scope (視野) → Phase 2 再做
--
-- 現況（2026-04-18 查 Supabase）:
--   - 實際表名是 public.workspace_roles（types.ts 誤寫為 roles）
--   - 3 workspace（CORNER / JINGYAO / YUFEN）各有 4 職務：管理員/業務/會計/助理
--   - 缺「團控」、seeder 會補
--   - employees 有 role_id、employee_type、is_bot；缺 capability flags → 本 migration 加
--
-- Risk: 🟢 LOW（只加欄位、加 function、seeder 只 insert 缺的 row、不改既有）
--       不動任何既有 row / 欄位、符合紅線
-- 🛑 DO NOT RUN until William approves
-- ================================================================


-- ============ Part 1: Capability flags 加到 employees ============

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_salesperson BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_tour_leader BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_accountant  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_tour_guide  BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.employees.is_salesperson IS '能被選為承辦業務（訂單、報價下拉）';
COMMENT ON COLUMN public.employees.is_tour_leader IS '能被選為團控（建團下拉）';
COMMENT ON COLUMN public.employees.is_accountant  IS '能被選為代墊款人、發票開立人';
COMMENT ON COLUMN public.employees.is_tour_guide  IS '能被選為領隊（帶團出國）';


-- ============ Part 2: Index（查下拉時快）============

CREATE INDEX IF NOT EXISTS idx_employees_is_salesperson
  ON public.employees (workspace_id) WHERE is_salesperson = true;

CREATE INDEX IF NOT EXISTS idx_employees_is_tour_leader
  ON public.employees (workspace_id) WHERE is_tour_leader = true;

CREATE INDEX IF NOT EXISTS idx_employees_is_accountant
  ON public.employees (workspace_id) WHERE is_accountant = true;

CREATE INDEX IF NOT EXISTS idx_employees_is_tour_guide
  ON public.employees (workspace_id) WHERE is_tour_guide = true;


-- ============ Part 3: 預設職務 seeder function ============
-- 只建 function、不自動執行
-- William 之後手動為每個 workspace 跑：
--   SELECT * FROM public.seed_default_roles_for_workspace('<workspace-id>');

CREATE OR REPLACE FUNCTION public.seed_default_roles_for_workspace(p_workspace_id UUID)
RETURNS TABLE(role_id UUID, role_name TEXT, action TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id UUID;
  v_name    TEXT;
  v_desc    TEXT;
  v_order   INT;
  -- 只 seed 缺的職務；現有 3 workspace 已有 管理員/業務/會計/助理、僅需補「團控」
  v_defaults CONSTANT TEXT[][] := ARRAY[
    ARRAY['業務', '接客戶、建訂單、跟客戶聯繫',   '10'],
    ARRAY['團控', '團務排程、團員管理、調度',     '20'],
    ARRAY['會計', '財務管理、對帳、代墊款、發票', '30'],
    ARRAY['助理', '後勤支援、多為只讀權限',       '40']
  ];
  v_row TEXT[];
BEGIN
  FOREACH v_row SLICE 1 IN ARRAY v_defaults LOOP
    v_name  := v_row[1];
    v_desc  := v_row[2];
    v_order := v_row[3]::INT;

    SELECT id INTO v_role_id
    FROM public.workspace_roles
    WHERE workspace_id = p_workspace_id AND name = v_name
    LIMIT 1;

    IF v_role_id IS NULL THEN
      INSERT INTO public.workspace_roles (workspace_id, name, description, is_admin, sort_order)
      VALUES (p_workspace_id, v_name, v_desc, false, v_order)
      RETURNING id INTO v_role_id;
      role_id := v_role_id;
      role_name := v_name;
      action := 'created';
    ELSE
      role_id := v_role_id;
      role_name := v_name;
      action := 'already_exists';
    END IF;
    RETURN NEXT;
  END LOOP;

  -- 備註：管理員（is_admin=true）由 workspace 創建流程處理、此 function 不建
END;
$$;

COMMENT ON FUNCTION public.seed_default_roles_for_workspace IS
  '建立預設 4 個職務（業務/團控/會計/助理）到指定 workspace；已存在則跳過。';

GRANT EXECUTE ON FUNCTION public.seed_default_roles_for_workspace(UUID) TO service_role;


-- ============ Part 4: 驗證查詢（apply 完跑這些檢查）============

-- 1) 欄位是否都加上
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='employees'
--   AND column_name IN ('is_salesperson', 'is_tour_leader', 'is_accountant', 'is_tour_guide');
-- 預期: 4 rows、data_type=boolean、default=false

-- 2) Function 是否存在
-- SELECT proname FROM pg_proc WHERE proname = 'seed_default_roles_for_workspace';
-- 預期: 1 row

-- 3) Index 是否建好
-- SELECT indexname FROM pg_indexes
-- WHERE tablename='employees' AND indexname LIKE 'idx_employees_is_%';
-- 預期: 4 rows


-- ============ Part 5: William 手動執行（apply 後）============

-- 為 Corner workspace 建預設職務：
-- SELECT * FROM public.seed_default_roles_for_workspace(
--   (SELECT id FROM public.workspaces WHERE code = 'CORNER')
-- );
-- 回傳 4 rows、action='created' 或 'already_exists'

-- 為其他 workspace（若有）：
-- SELECT * FROM public.seed_default_roles_for_workspace(
--   (SELECT id FROM public.workspaces WHERE code = 'XXX')
-- );


-- ============ Rollback plan（若 apply 後發現問題）============

-- Step 1: 移除 function
-- DROP FUNCTION IF EXISTS public.seed_default_roles_for_workspace(UUID);

-- Step 2: 移除 index
-- DROP INDEX IF EXISTS public.idx_employees_is_salesperson;
-- DROP INDEX IF EXISTS public.idx_employees_is_tour_leader;
-- DROP INDEX IF EXISTS public.idx_employees_is_accountant;
-- DROP INDEX IF EXISTS public.idx_employees_is_tour_guide;

-- Step 3: 移除欄位（注意：若 UI 已經開始用、rollback 前要先清 UI）
-- ALTER TABLE public.employees DROP COLUMN IF EXISTS is_salesperson;
-- ALTER TABLE public.employees DROP COLUMN IF EXISTS is_tour_leader;
-- ALTER TABLE public.employees DROP COLUMN IF EXISTS is_accountant;
-- ALTER TABLE public.employees DROP COLUMN IF EXISTS is_tour_guide;

-- Step 4: 若 seed 已跑、該 role 若不要保留
-- DELETE FROM public.workspace_roles
-- WHERE name IN ('業務', '團控', '會計', '助理')
--   AND workspace_id = '<xxx>'
--   AND id NOT IN (SELECT role_id FROM employees WHERE role_id IS NOT NULL);
-- 小心：若員工已 assigned 此 role、應先移員工的 role_id 再刪
