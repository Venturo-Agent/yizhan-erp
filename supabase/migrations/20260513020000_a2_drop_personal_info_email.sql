-- ─────────────────────────────────────────────────────────────────────────────
-- A2: 砍 employees.personal_info.email（William 2026-05-13 拍板）
--
-- 背景：
--   過去 employees 表寫 email 雙軌：top-level `email` + `personal_info.email`
--   兩處不一致時、不知道讀哪個。
--   2026-05-11 規格已定 top-level `email` 為 SSOT、personal_info.email 廢棄相容。
--   2026-05-13 William 拍板：徹底砍 personal_info.email。
--
-- 本 migration 做兩件事：
--   1. 把仍有 personal_info.email 但 top-level email NULL 的 row backfill 過去（保資料）
--   2. 從所有 personal_info JSONB 移除 'email' key（清欄位）
--
-- 風險：
--   - 純 JSONB 操作、不動 schema
--   - 不刪 row、不會丟資料
--   - 如果 frontend 還有讀 personal_info.email 的、會吃到 undefined（已在本 PR 改 EmployeeForm.tsx 同步砍）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Pre-check：找有差異的 row（display only）
DO $$
DECLARE
  v_inconsistent int;
BEGIN
  SELECT COUNT(*) INTO v_inconsistent
  FROM public.employees
  WHERE personal_info ? 'email'
    AND (email IS NULL OR email = '')
    AND personal_info->>'email' IS NOT NULL
    AND personal_info->>'email' != '';
  RAISE NOTICE 'employees with personal_info.email but no top-level email: %', v_inconsistent;
END $$;

-- Step 1: backfill top-level email from personal_info.email（如果 top-level NULL 或空）
UPDATE public.employees
SET email = personal_info->>'email'
WHERE personal_info ? 'email'
  AND (email IS NULL OR email = '')
  AND personal_info->>'email' IS NOT NULL
  AND personal_info->>'email' != '';

-- Step 2: 從所有 personal_info 移除 'email' key
UPDATE public.employees
SET personal_info = personal_info - 'email'
WHERE personal_info ? 'email';

-- Verify
DO $$
DECLARE v_remaining int;
BEGIN
  SELECT COUNT(*) INTO v_remaining
  FROM public.employees
  WHERE personal_info ? 'email';

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'A2 驗證失敗：% rows 仍有 personal_info.email', v_remaining;
  END IF;

  RAISE NOTICE '✓ A2 完成：personal_info.email 全清';
END $$;

COMMIT;
