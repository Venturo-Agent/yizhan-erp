-- ════════════════════════════════════════════════════════════════════════════
-- Migration: employees branch_id ↔ department.branch_id 一致性 trigger
-- 2026-05-14 Robin
--
-- 背景：
--   employees 有 branch_id + department_id 兩個獨立 FK、但業務上必須一致
--   （員工屬台北分公司 → 部門必須是台北分公司底下的部門）。
--   現況前端 EmployeeForm 沒做級聯（同 PR 後續會補）、就算補了 trigger 還是要
--   當 backstop、防手動 SQL / 別的 caller 寫出不一致 row。
--
-- 規則：
--   - department_id IS NULL → OK（員工還沒指派部門）
--   - department_id NOT NULL + branch_id IS NULL → 拒絕（有部門就必須有分公司）
--   - department_id NOT NULL + branch_id NOT NULL + department.branch_id != employees.branch_id → 拒絕
--   - department_id NOT NULL + branch_id NOT NULL + 對齊 → OK
--
-- 安全性：
--   - 用 SECURITY DEFINER 不用、function 本身只 SELECT 不寫
--   - 不擋現有 row（沒 ALTER TABLE ADD CONSTRAINT NOT VALID 之類）、只擋未來 insert/update
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.check_employee_branch_dept_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  dept_branch_id uuid;
BEGIN
  IF NEW.department_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.branch_id IS NULL THEN
    RAISE EXCEPTION '員工有部門就必須有分公司（branch_id 不可為空）'
      USING ERRCODE = '23514', COLUMN = 'branch_id';
  END IF;

  SELECT d.branch_id INTO dept_branch_id
  FROM public.departments d
  WHERE d.id = NEW.department_id;

  IF dept_branch_id IS NULL THEN
    RAISE EXCEPTION '部門資料不完整（branch_id 為空）、無法驗證一致性'
      USING ERRCODE = '23514';
  END IF;

  IF dept_branch_id != NEW.branch_id THEN
    RAISE EXCEPTION '員工分公司（%）跟部門所屬分公司（%）不一致', NEW.branch_id, dept_branch_id
      USING ERRCODE = '23514', COLUMN = 'department_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employees_branch_dept_consistency ON public.employees;
CREATE TRIGGER trg_employees_branch_dept_consistency
  BEFORE INSERT OR UPDATE OF branch_id, department_id ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.check_employee_branch_dept_consistency();

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_employees_branch_dept_consistency ON public.employees;
-- DROP FUNCTION IF EXISTS public.check_employee_branch_dept_consistency();
-- COMMIT;
