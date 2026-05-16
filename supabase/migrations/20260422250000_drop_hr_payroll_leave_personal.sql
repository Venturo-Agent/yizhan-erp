-- 2026-04-22: 砍 HR 出勤/請假/薪資/獎金 + 個人功能 + 領隊排程
-- William 決策：保留 employees / workspace_attendance_settings / /hr/roles / /hr/settings 為未來打卡準備
BEGIN;
-- 出勤打卡（保留 workspace_attendance_settings 表本身）
DROP TABLE IF EXISTS public.attendance_records CASCADE;
-- 請假
DROP TABLE IF EXISTS public.leave_balances CASCADE;
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.leave_types CASCADE;
-- 薪資
DROP TABLE IF EXISTS public.payroll_records CASCADE;
DROP TABLE IF EXISTS public.payroll_periods CASCADE;
DROP TABLE IF EXISTS public.payroll_allowance_types CASCADE;
DROP TABLE IF EXISTS public.payroll_deduction_types CASCADE;
DROP TABLE IF EXISTS public.employee_payroll_config CASCADE;
-- 獎金
DROP TABLE IF EXISTS public.tour_bonus_settings CASCADE;
DROP TABLE IF EXISTS public.workspace_bonus_defaults CASCADE;
-- 通知
DROP TABLE IF EXISTS public.workspace_notification_settings CASCADE;
-- 領隊排程
DROP VIEW  IF EXISTS public.leader_schedules_with_leader CASCADE;
DROP TABLE IF EXISTS public.leader_schedules CASCADE;
-- 個人功能
DROP TABLE IF EXISTS public.personal_canvases CASCADE;
DROP TABLE IF EXISTS public.personal_records CASCADE;
DROP TABLE IF EXISTS public.personal_expenses CASCADE;
DROP TABLE IF EXISTS public.timebox_scheduled_boxes CASCADE;
DROP TABLE IF EXISTS public.pnr_schedule_changes CASCADE;

-- 拔 workspace_attendance_settings 寬鬆 ALL policy（保留表給未來打卡）
DROP POLICY IF EXISTS workspace_attendance_settings_service ON public.workspace_attendance_settings;
COMMIT;
