-- ─────────────────────────────────────────────────────────────────────────────
-- 新租戶 Onboarding Seed
-- 2026-05-14 William 拍板
--
-- 新 workspace 建立時自動 seed：
--   1. 4 個預設職務（系統管理員 / 業務 / 助理 / 會計）
--   2. 第一個分公司（type='headquarters'、name=workspace.name）
--   3. 第一個部門（type='headquarters'、name='總部'）
--
-- 暫不 seed：
--   - 品牌（William 擱置等討論）
--   - 員工（老闆註冊時建、不在 trigger 內）
--   - 國家 / 機場（走 shared_data、漫途維護、不每客戶 seed）
--
-- 同時：
--   - branches / departments 加 type enum 欄位
--   - 既有 workspaces 的 first branch/department backfill type='headquarters'
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════ 1. 加 type 欄位 ════
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'custom'
  CHECK (type IN ('headquarters', 'branch', 'custom'));

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'custom'
  CHECK (type IN ('headquarters', 'department', 'custom'));

COMMENT ON COLUMN public.branches.type IS
  'enum: headquarters=總公司本身 / branch=分公司 / custom=客戶自加。name 是顯示給人看的、type 是系統識別（跨 workspace 一致）';
COMMENT ON COLUMN public.departments.type IS
  'enum: headquarters=總部 / department=一般部門 / custom=客戶自加';

-- ════ 2. Backfill 既有 workspaces ════
-- 每個 workspace 的「最早建立的 branch」設成 headquarters
UPDATE public.branches b
SET type = 'headquarters'
WHERE b.id IN (
  SELECT DISTINCT ON (workspace_id) id
  FROM public.branches
  WHERE type = 'custom'
  ORDER BY workspace_id, created_at ASC
);

-- 同樣 departments
UPDATE public.departments d
SET type = 'headquarters'
WHERE d.id IN (
  SELECT DISTINCT ON (workspace_id) id
  FROM public.departments
  WHERE type = 'custom'
  ORDER BY workspace_id, created_at ASC
);

-- ════ 3. seed_new_workspace function ════
CREATE OR REPLACE FUNCTION public.seed_new_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role_id UUID;
BEGIN
  -- 1. 預設 4 個職務（系統管理員 + 業務 + 助理 + 會計）
  INSERT INTO public.workspace_roles (workspace_id, name, description, is_admin, sort_order) VALUES
    (NEW.id, '系統管理員', '工作空間最高權限、預留給老闆 / 創辦人', true, 1)
  RETURNING id INTO v_admin_role_id;

  INSERT INTO public.workspace_roles (workspace_id, name, description, is_admin, sort_order) VALUES
    (NEW.id, '業務', '負責訂單 / 客戶 / 報價', false, 2),
    (NEW.id, '助理', '協助業務處理單據 / 文件', false, 3),
    (NEW.id, '會計', '請款 / 收款 / 帳務', false, 4);

  -- 2. 第一個分公司（type=headquarters、name=workspace 公司名）
  INSERT INTO public.branches (workspace_id, name, code, type, is_default, is_active, display_order)
  VALUES (NEW.id, NEW.name, 'HQ', 'headquarters', true, true, 1);

  -- 3. 第一個部門（type=headquarters、name='總部'）
  INSERT INTO public.departments (workspace_id, name, code, type, is_default, is_active, display_order)
  VALUES (NEW.id, '總部', 'HQ', 'headquarters', true, true, 1);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.seed_new_workspace() IS
  'AFTER INSERT trigger function: 新 workspace 建立時自動 seed 4 roles + 1 branch + 1 department。
   不 seed brands（William 擱置）/ employees（老闆註冊時建）/ countries+airports（走 shared_data）';

-- ════ 4. 掛 trigger 到 workspaces.AFTER INSERT ════
DROP TRIGGER IF EXISTS trg_workspaces_onboarding_seed ON public.workspaces;
CREATE TRIGGER trg_workspaces_onboarding_seed
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.seed_new_workspace();

-- ════ 5. 驗證 ════
DO $$
DECLARE
  v_branches_hq int;
  v_depts_hq int;
BEGIN
  SELECT count(*) INTO v_branches_hq FROM public.branches WHERE type='headquarters';
  SELECT count(*) INTO v_depts_hq FROM public.departments WHERE type='headquarters';
  RAISE NOTICE '✓ branches 加 type、% 個 workspace 的 branch 已 backfill headquarters', v_branches_hq;
  RAISE NOTICE '✓ departments 加 type、% 個 workspace 的 department 已 backfill headquarters', v_depts_hq;
  RAISE NOTICE '✓ seed_new_workspace() function + trigger 建好';
END $$;

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_workspaces_onboarding_seed ON public.workspaces;
-- DROP FUNCTION IF EXISTS public.seed_new_workspace();
-- ALTER TABLE public.branches DROP COLUMN IF EXISTS type;
-- ALTER TABLE public.departments DROP COLUMN IF EXISTS type;
-- COMMIT;
