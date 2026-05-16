-- ─────────────────────────────────────────────────────────────────────────────
-- 員工資格表（5/13 William 拍板）
--
-- 緣起：HR /hr/roles 把「可當業務 / 助理 / 團控 / 代墊」也當 role capability、
--      但這是員工個人屬性、不是職務權限。
--      改放員工編輯頁勾、跟 employee_brands / employee_branches / employee_departments
--      同樣 pattern（員工 vs 屬性 join 表）。
--
-- Schema：
--   employee_eligibilities (employee_id, eligibility_code, workspace_id, ...)
--
-- Eligibility codes 來源：modules/* isEligibility=true tabs（5/13 起改不衍生 capability）
--   - tours.as_sales / tours.as_assistant / tours.as_controller
--   - finance.advance_payment
--
-- 遷移：從現有 role_capabilities 推導員工的資格、批次 INSERT
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. 建表
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.employee_eligibilities (
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  eligibility_code text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  PRIMARY KEY (employee_id, eligibility_code)
);

-- Index：workspace 過濾 + eligibility query
CREATE INDEX IF NOT EXISTS employee_eligibilities_workspace_idx
  ON public.employee_eligibilities (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS employee_eligibilities_code_idx
  ON public.employee_eligibilities (eligibility_code);

COMMENT ON TABLE public.employee_eligibilities IS
  '員工資格表（5/13）：員工個人屬性、不是 role 權限。對應 modules/ isEligibility=true tabs。員工編輯頁勾選。';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RLS（走 workspace_scoped pattern）
-- ═══════════════════════════════════════════════════════════════════════════
CALL public.setup_workspace_scoped_rls('employee_eligibilities');

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. 從 role_capabilities 遷移現有資料
-- ═══════════════════════════════════════════════════════════════════════════
-- 邏輯：員工的 role 如果有 X 資格的 .write capability、員工就有 X 資格
INSERT INTO public.employee_eligibilities (employee_id, eligibility_code, workspace_id)
SELECT DISTINCT
  e.id,
  REPLACE(rc.capability_code, '.write', '') AS eligibility_code,
  e.workspace_id
FROM public.employees e
JOIN public.role_capabilities rc ON rc.role_id = e.role_id
WHERE e.role_id IS NOT NULL
  AND e.workspace_id IS NOT NULL
  AND rc.capability_code IN (
    'tours.as_sales.write',
    'tours.as_assistant.write',
    'tours.as_controller.write',
    'finance.advance_payment.write'
  )
ON CONFLICT (employee_id, eligibility_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. 完工驗證
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_employee_count INT;
  v_eligibility_count INT;
  v_distinct_codes TEXT;
BEGIN
  SELECT count(DISTINCT employee_id), count(*)
    INTO v_employee_count, v_eligibility_count
    FROM public.employee_eligibilities;

  SELECT string_agg(DISTINCT eligibility_code, ', ' ORDER BY eligibility_code)
    INTO v_distinct_codes
    FROM public.employee_eligibilities;

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ employee_eligibilities 表建立 + 遷移完成';
  RAISE NOTICE '  涵蓋員工數：%', v_employee_count;
  RAISE NOTICE '  總資格 row：%', v_eligibility_count;
  RAISE NOTICE '  資格 code 種類：%', COALESCE(v_distinct_codes, '(無)');
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 後續（caller migration、UI 改造、capabilities.ts 內 4 個 legacy 清掉）
-- 不在此 migration 範圍、由 Logan 在後續 commit 處理
-- ─────────────────────────────────────────────────────────────────────────────
