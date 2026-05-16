-- ─────────────────────────────────────────────────────────────────────────────
-- RBAC + ABAC 大改：Role scope + Cross-access + Eligibility
-- 2026-05-14 William 拍板（telegram messages 1115-1142）
--
-- 三層架構：
--   1. Role：每個 capability 3 個 boolean（read / write / write_others）
--   2. Cross-access：員工身上 multi-select（可讀分公司 / 可讀部門）
--   3. Eligibility：員工身上 multi-select（可當業務 / 助理 / 團控 / 代墊）
--
-- 本 migration：
--   A. role_capabilities 加 can_write_others boolean（預設 false、嚴格）
--   B. employees 加 accessible_branch_ids uuid[] + accessible_department_ids uuid[]
--   C. 補 seed_new_workspace function、新增 2 個 role：部門主管 / 業務主管
--   D. 既有 4 workspaces 補 seed 2 個新 role
--
-- 暫不動（後續另一 migration）：
--   - RLS policies 改吃 cross-access（要 review 全部 policies、複雜）
--   - is_dept_manager flag 砍（UI 改）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════ A. role_capabilities 加 can_write_others ════
ALTER TABLE public.role_capabilities
  ADD COLUMN IF NOT EXISTS can_write_others BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.role_capabilities.can_write_others IS
  '此 role 是否能跨改別人資料（write_others）。預設 FALSE：嚴格、只寫自己。
   只在 .write capability 上有意義（.read 不需要）。
   主管 role HR 可開啟、讓主管能改部門 / 分公司內別人資料。';

-- ════ B. employees 加 cross-access multi-select 欄位 ════
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS accessible_branch_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accessible_department_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.employees.accessible_branch_ids IS
  '此員工額外可讀取的分公司 id 清單。
   空 = 預設員工自己 branch_id（fallback）。
   有值 = 嚴格按清單。
   譬如台北業務想額外讀台中 → HR 加 [台中 id]。';

COMMENT ON COLUMN public.employees.accessible_department_ids IS
  '此員工額外可讀取的部門 id 清單（邏輯同 accessible_branch_ids）。';

-- ════ C. seed_new_workspace function 補 2 個新 role ════
CREATE OR REPLACE FUNCTION public.seed_new_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 6 個預設職務（William 2026-05-14 拍板）
  INSERT INTO public.workspace_roles (workspace_id, name, description, is_admin, sort_order) VALUES
    (NEW.id, '系統管理員', '工作空間最高權限、預留給老闆 / 創辦人。讀寫所有人、所有分公司、所有部門。', true, 1),
    (NEW.id, '部門主管', '看部門內所有人、但不改別人資料（嚴格預設）。要主管能改 → HR 自己改 role 的 can_write_others。', false, 2),
    (NEW.id, '業務主管', '看部門內所有人 + 能改別人（寫入跨人）。適合需要改別人資料的主管。', false, 3),
    (NEW.id, '業務', '一線業務、讀寫自己。', false, 4),
    (NEW.id, '會計', '會計 / 財務、讀寫所有人（做帳必要）。', false, 5),
    (NEW.id, '助理', '一線助理、讀寫自己。', false, 6);

  -- 第一個分公司
  INSERT INTO public.branches (workspace_id, name, code, type, is_default, is_active, display_order)
  VALUES (NEW.id, NEW.name, 'HQ', 'headquarters', true, true, 1);

  -- 第一個部門
  INSERT INTO public.departments (workspace_id, name, code, type, is_default, is_active, display_order)
  VALUES (NEW.id, '總部', 'HQ', 'headquarters', true, true, 1);

  RETURN NEW;
END;
$$;

-- ════ D. 既有 4 workspaces 補 seed 2 個新 role（部門主管 / 業務主管）════
INSERT INTO public.workspace_roles (workspace_id, name, description, is_admin, sort_order)
SELECT
  w.id,
  '部門主管',
  '看部門內所有人、但不改別人資料（嚴格預設）。要主管能改 → HR 自己改 role 的 can_write_others。',
  false,
  COALESCE(
    (SELECT max(sort_order) + 1 FROM public.workspace_roles WHERE workspace_id = w.id),
    2
  )
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_roles wr
  WHERE wr.workspace_id = w.id AND wr.name = '部門主管'
);

INSERT INTO public.workspace_roles (workspace_id, name, description, is_admin, sort_order)
SELECT
  w.id,
  '業務主管',
  '看部門內所有人 + 能改別人（寫入跨人）。適合需要改別人資料的主管。',
  false,
  COALESCE(
    (SELECT max(sort_order) + 1 FROM public.workspace_roles WHERE workspace_id = w.id),
    3
  )
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_roles wr
  WHERE wr.workspace_id = w.id AND wr.name = '業務主管'
);

-- ════ 驗證 ════
DO $$
DECLARE
  v_role_count_corner int;
  v_role_count_venturo int;
BEGIN
  SELECT count(*) INTO v_role_count_corner FROM public.workspace_roles
  WHERE workspace_id='a89335d4-85f1-492b-83c7-2476ab7c5d81';
  SELECT count(*) INTO v_role_count_venturo FROM public.workspace_roles
  WHERE workspace_id='b2222222-2222-2222-2222-222222222222';

  RAISE NOTICE '✓ role_capabilities 加 can_write_others column';
  RAISE NOTICE '✓ employees 加 accessible_branch_ids + accessible_department_ids';
  RAISE NOTICE '✓ 角落 workspace 現有 % roles', v_role_count_corner;
  RAISE NOTICE '✓ 漫途 workspace 現有 % roles', v_role_count_venturo;
END $$;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- ALTER TABLE role_capabilities DROP COLUMN IF EXISTS can_write_others;
-- ALTER TABLE employees DROP COLUMN IF EXISTS accessible_branch_ids;
-- ALTER TABLE employees DROP COLUMN IF EXISTS accessible_department_ids;
-- -- 砍 2 個新 role（小心：已分給員工的 role 會 cascade、要先 reassign）
-- DELETE FROM workspace_roles WHERE name IN ('部門主管', '業務主管');
-- COMMIT;
