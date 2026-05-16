-- 砍 5/7 拍板「HR 只留員工列表 + 職務管理、員工自查薪資也不要」後的 DB 清理
--
-- 5/7 William 拍板：HR 系統就只有人資可以進去、確認人資列表跟職務管理。
-- /payslip + /api/hr/payslips 已在 batch A 砍 code、本檔清對應 DB 表 + 殘留 capability。
--
-- 砍的 DB 物件：
--   View (1 條)   v_attendance_daily
--   Tables (9 條)  payslips / payroll_runs / clock_records / missed_clock_requests
--                  leave_requests / leave_balances / leave_types
--                  overtime_requests / workspace_attendance_settings
--   Functions (2 條) create_default_leave_types / update_leave_balance_on_approval
--   Capabilities (1 組 × 2)  hr.payroll.read / hr.payroll.write（前次 migration 為 /payslip 保留、現一起砍）
--
-- 不動：
--   tour_bonus_settings (20 rows、tour 出團獎金、跟 HR 出勤無關)
--   workspace_bonus_defaults (tour 出團獎金預設、同上)
--   employees.salary_info.attendance_bonus 欄位（embedded 屬性、跟 attendance 表無 FK）
--
-- 跑這支前 William 必須拍板：5/7 確認「這些也都沒有資料、可全刪」

-- ─────────────────────────────────────────
-- 1. DROP VIEW (depends on tables、要先砍)
-- ─────────────────────────────────────────
DROP VIEW IF EXISTS public.v_attendance_daily;

-- ─────────────────────────────────────────
-- 2. DROP TABLES (FK-safe order)
-- ─────────────────────────────────────────
-- payslips → payroll_runs → ...
DROP TABLE IF EXISTS public.payslips CASCADE;
DROP TABLE IF EXISTS public.payroll_runs CASCADE;

-- clock_records → missed_clock_requests
DROP TABLE IF EXISTS public.clock_records CASCADE;
DROP TABLE IF EXISTS public.missed_clock_requests CASCADE;

-- leave_requests → leave_balances → leave_types
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.leave_balances CASCADE;
DROP TABLE IF EXISTS public.leave_types CASCADE;

-- 獨立
DROP TABLE IF EXISTS public.overtime_requests CASCADE;
DROP TABLE IF EXISTS public.workspace_attendance_settings CASCADE;

-- ─────────────────────────────────────────
-- 3. DROP FUNCTIONS (CASCADE 應已自動清掉、保險顯式 DROP)
-- ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.create_default_leave_types() CASCADE;
DROP FUNCTION IF EXISTS public.update_leave_balance_on_approval() CASCADE;

-- ─────────────────────────────────────────
-- 4. 清 hr.payroll.* capability（前次 migration 為 /payslip 保留、現可一起砍）
-- ─────────────────────────────────────────
DELETE FROM public.role_capabilities
WHERE capability_code IN (
  'hr.payroll.read',
  'hr.payroll.write'
);

-- ─────────────────────────────────────────
-- 5. 清 user_preferences 殘留 clock-in widget id（dashboard widget 砍了）
-- ─────────────────────────────────────────
UPDATE public.user_preferences
SET preference_value = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(preference_value) elem
  WHERE elem::text <> '"clock-in"'
)
WHERE preference_key = 'homepage-widgets-order'
  AND preference_value::text LIKE '%clock-in%';
