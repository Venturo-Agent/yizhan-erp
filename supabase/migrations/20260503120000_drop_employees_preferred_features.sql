-- ============================================================================
-- 20260503120000_drop_employees_preferred_features.sql
--
-- 砍 employees.preferred_features 欄位
-- William 2026-05-02 拍板：「個人偏好設定這個功能、以前已經砍掉了、應該要清乾淨」
--
-- 起因：sidebar 還有 preferred_features 過濾邏輯、employees 有殘留資料
-- William 的 ['*', 'todos', ...] 觸發 bug 隱藏 menu。整套清乾淨：
--   - sidebar.tsx 過濾邏輯（已移除）
--   - user.types.ts type（已移除）
--   - employees 欄位（本 migration）
-- ============================================================================

ALTER TABLE public.employees
  DROP COLUMN IF EXISTS preferred_features;
