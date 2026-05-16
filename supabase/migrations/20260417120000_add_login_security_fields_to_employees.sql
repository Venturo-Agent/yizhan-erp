-- ============================================================================
-- Migration: 補齊 employees 表的登入安全欄位
-- Date: 2026-04-17
-- Reason: Commit 94fd3fd2 (P0 資安修復) 在 code 中加入帳號鎖定機制
--         但未寫對應 migration，導致 validate-login API 查詢
--         login_failed_count / login_locked_until 兩個不存在的欄位 → 全站登入失敗
-- Impact: 非破壞性 — 加欄位 + default，不動既有資料
-- ============================================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS login_failed_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS login_locked_until TIMESTAMPTZ;

COMMENT ON COLUMN employees.login_failed_count IS
  '登入失敗次數（達 5 次鎖定 15 分鐘，對應 /api/auth/validate-login 的鎖定邏輯）';
COMMENT ON COLUMN employees.login_locked_until IS
  '帳號鎖定到期時間（NULL = 未鎖定；unlock 時重置為 NULL）';
