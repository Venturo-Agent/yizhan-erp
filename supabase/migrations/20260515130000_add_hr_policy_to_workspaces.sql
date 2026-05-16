-- ─────────────────────────────────────────────────────────────────────────────
-- 公司 HR 設定欄位（特休制度 / 資遣費制度）
--
-- 2026-05-15 William 拍板：特休制度全 workspace 統一、不分員工。資遣費新舊制也是公司級設定。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS leave_policy TEXT NOT NULL DEFAULT 'hire_anniversary'
    CHECK (leave_policy IN ('calendar_year', 'hire_anniversary')),
  ADD COLUMN IF NOT EXISTS pension_system TEXT NOT NULL DEFAULT 'new'
    CHECK (pension_system IN ('old', 'new', 'mixed'));

COMMENT ON COLUMN public.workspaces.leave_policy IS
  '特休制度：calendar_year (年度制、曆年 1/1 重算) / hire_anniversary (週年制、到職日重算)';
COMMENT ON COLUMN public.workspaces.pension_system IS
  '資遣費制度：old (舊制、1 年 1 月) / new (新制、1 年 0.5 月、上限 6 月) / mixed (跨制、舊制段+新制段分算)';

COMMIT;

-- ════════ Rollback ════════
-- BEGIN;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS leave_policy;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS pension_system;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
