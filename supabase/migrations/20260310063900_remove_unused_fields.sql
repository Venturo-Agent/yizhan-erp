-- =====================================================
-- 刪除多餘欄位 — 減少 AI 誤用風險
-- =====================================================
-- 日期: 2026-03-10
-- 作者: 馬修 (Matthew)
-- 目的: 清理完全未使用或使用率極低的欄位
-- 
-- 背景:
-- William 核心洞察：「多餘欄位 = AI 的噪音」
-- AI 看到欄位 → 以為要用 → 但欄位已廢棄 → 誤用 → 出錯
-- 
-- 刪除欄位:
-- 1. tours.op_staff_id - 完全未使用 (0次引用)
--    原因: 已被 controller_id 取代，成為歷史遺留
-- 2. employees.last_login_at - 使用率極低 (2次引用，僅在SELECT但未實際使用)
--    原因: 沒有任何登入更新邏輯，也沒有UI顯示
-- 
-- 影響評估:
-- ✅ 前端代碼: 無影響 (tours.op_staff_id 無使用)
-- ✅ 前端代碼: 無影響 (employees.last_login_at 僅在SELECT但未使用值)
-- ✅ 資料庫: 低風險 (欄位資料無用)
-- ✅ 類型定義: 需執行 supabase gen types 更新
-- ✅ AI 認知: 減少 2 個噪音欄位
-- =====================================================

-- 1. 刪除 tours.op_staff_id
ALTER TABLE tours DROP COLUMN IF EXISTS op_staff_id;

-- 2. 刪除 employees.last_login_at  
ALTER TABLE employees DROP COLUMN IF EXISTS last_login_at;

-- 註記:
-- - tours.op_staff_id 已被 controller_id 取代
-- - employees.last_login_at 缺乏配套功能（無登入更新邏輯、無UI顯示）
-- - 如需恢復，可從 git 歷史查看欄位定義
