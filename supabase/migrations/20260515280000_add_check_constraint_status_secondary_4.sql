-- ════════════════════════════════════════════════════════════════════
-- 加 CHECK constraint：quotes / todos / employees / checks
--
-- 為什麼：
--   2026-05-15 SSOT 盤點、4 張表 status 欄缺 CHECK constraint
--   對齊 SSOT：src/lib/design/status-tone-map.ts STATUS_LABEL_MAP
--
-- 不動：
--   journal_vouchers — 已是原生 voucher_status enum、本身就限定（4 值對齊 SSOT）
--   contracts — 留到 4c（要先擴 SSOT 接受 draft / cancelled、現在 SSOT 只寫 unsigned/signed）
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- quotes：SSOT 6 狀態（移除誤值「待出發」）
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'proposed'::text, 'revised'::text, 'approved'::text, 'converted'::text, 'rejected'::text]));

-- todos：SSOT 4 狀態
ALTER TABLE public.todos
  ADD CONSTRAINT todos_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]));

-- employees：SSOT 7 狀態
ALTER TABLE public.employees
  ADD CONSTRAINT employees_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'terminated'::text, 'on_leave'::text, 'probation'::text, 'leave'::text]));

-- checks：SSOT 6 狀態
ALTER TABLE public.checks
  ADD CONSTRAINT checks_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'cleared'::text, 'bounced'::text, 'cancelled'::text, 'deposited'::text, 'issued'::text]));

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
-- ALTER TABLE public.todos DROP CONSTRAINT IF EXISTS todos_status_check;
-- ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_status_check;
-- ALTER TABLE public.checks DROP CONSTRAINT IF EXISTS checks_status_check;
-- COMMIT;
