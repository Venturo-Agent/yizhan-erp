-- ============================================================================
-- 砍 employees.line_user_id 欄位（LINE 打卡綁定殘留）
-- ============================================================================
-- 補 20260504071146_drop_chatbot_legacy.sql 漏掉的 employees 欄位。
-- William 拍板：LINE 打卡不該存在，網頁打卡保留（enable_web_clock + attendance_records）。
-- 17 員工 1 筆有值（測試），砍前已確認資料無業務價值。
-- ============================================================================

ALTER TABLE public.employees DROP COLUMN IF EXISTS line_user_id;
