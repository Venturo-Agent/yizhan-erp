-- ============================================================================
-- 補建 tour_bonus_settings + workspace_bonus_defaults 兩張表
-- ============================================================================
-- 前端 (BonusSettingTab / ProfitTab / TourClosingDialog / profit-calculation.service)
-- 已完整實作、DB 表缺、所以 console 一直噴 "Could not find the table" error。
-- Schema 對齊 src/types/bonus.types.ts、RLS follow tours pattern。
--
-- 純加法 migration、無風險、按 CLAUDE.md 紅線 0 例外可直接 apply。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. workspace_bonus_defaults — 租戶層級的獎金預設值
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_bonus_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type INTEGER NOT NULL CHECK (type BETWEEN 0 AND 4),
  bonus NUMERIC NOT NULL DEFAULT 0,
  bonus_type INTEGER NOT NULL CHECK (bonus_type BETWEEN 0 AND 3),
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_bonus_defaults_workspace
  ON public.workspace_bonus_defaults(workspace_id);

ALTER TABLE public.workspace_bonus_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_bonus_defaults_select ON public.workspace_bonus_defaults
  FOR SELECT USING (workspace_id = get_current_user_workspace());
CREATE POLICY workspace_bonus_defaults_insert ON public.workspace_bonus_defaults
  FOR INSERT WITH CHECK (workspace_id = get_current_user_workspace());
CREATE POLICY workspace_bonus_defaults_update ON public.workspace_bonus_defaults
  FOR UPDATE USING (workspace_id = get_current_user_workspace());
CREATE POLICY workspace_bonus_defaults_delete ON public.workspace_bonus_defaults
  FOR DELETE USING (workspace_id = get_current_user_workspace());

CREATE TRIGGER trigger_auto_set_workspace_id_bonus_defaults
  BEFORE INSERT ON public.workspace_bonus_defaults
  FOR EACH ROW EXECUTE FUNCTION auto_set_workspace_id();

CREATE TRIGGER update_workspace_bonus_defaults_updated_at
  BEFORE UPDATE ON public.workspace_bonus_defaults
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. tour_bonus_settings — 單團獎金設定（覆蓋 workspace_bonus_defaults）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tour_bonus_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tour_id TEXT NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  type INTEGER NOT NULL CHECK (type BETWEEN 0 AND 4),
  bonus NUMERIC NOT NULL DEFAULT 0,
  bonus_type INTEGER NOT NULL CHECK (bonus_type BETWEEN 0 AND 3),
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_bonus_settings_workspace
  ON public.tour_bonus_settings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tour_bonus_settings_tour
  ON public.tour_bonus_settings(tour_id);

ALTER TABLE public.tour_bonus_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tour_bonus_settings_select ON public.tour_bonus_settings
  FOR SELECT USING (workspace_id = get_current_user_workspace());
CREATE POLICY tour_bonus_settings_insert ON public.tour_bonus_settings
  FOR INSERT WITH CHECK (workspace_id = get_current_user_workspace());
CREATE POLICY tour_bonus_settings_update ON public.tour_bonus_settings
  FOR UPDATE USING (workspace_id = get_current_user_workspace());
CREATE POLICY tour_bonus_settings_delete ON public.tour_bonus_settings
  FOR DELETE USING (workspace_id = get_current_user_workspace());

CREATE TRIGGER trigger_auto_set_workspace_id_tour_bonus
  BEFORE INSERT ON public.tour_bonus_settings
  FOR EACH ROW EXECUTE FUNCTION auto_set_workspace_id();

CREATE TRIGGER update_tour_bonus_settings_updated_at
  BEFORE UPDATE ON public.tour_bonus_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
