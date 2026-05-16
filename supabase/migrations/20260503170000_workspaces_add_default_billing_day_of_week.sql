-- ============================================================================
-- 20260503170000_workspaces_add_default_billing_day_of_week.sql
--
-- 預設出帳日期 SaaS 化
-- 取代 RequestDateInput hardcoded 'isThursday' = day === 4 邏輯
-- 0 = 週日 ... 4 = 週四 ... 6 = 週六
-- 預設 4（週四、Corner 旅行社既有規則）
-- ============================================================================

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS default_billing_day_of_week integer
  CHECK (default_billing_day_of_week BETWEEN 0 AND 6)
  DEFAULT 4;

COMMENT ON COLUMN public.workspaces.default_billing_day_of_week IS '預設出帳星期幾 (0=週日, 1=週一, ..., 6=週六)。請款 dialog 用這個判斷「特殊出帳」（非預設日），預設 4=週四（Corner 旅行社既有規則）。';
