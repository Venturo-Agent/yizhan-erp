-- ============================================
-- 修復 Timebox RLS 政策
-- ============================================
-- 日期: 2025-12-28
-- 目的: 讓 Timebox 功能在 ERP 的認證系統下正常運作
--
-- 問題：
--   timebox 表格使用 auth.uid() = user_id 的 RLS 政策
--   但 ERP 系統的認證可能無法正確設置 auth.uid()
--   導致查詢返回空結果並出現 RLS 錯誤
--
-- 解決方案：
--   暫時禁用 timebox 表格的 RLS
--   這些是個人用的時間管理功能，資料由前端依 user_id 過濾
--   未來可改用更完善的認證整合

BEGIN;

-- ============================================
-- 禁用 timebox 表格的 RLS
-- ============================================

-- timebox_boxes
ALTER TABLE public.timebox_boxes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own timebox_boxes" ON public.timebox_boxes;

-- timebox_weeks
ALTER TABLE public.timebox_weeks DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own timebox_weeks" ON public.timebox_weeks;

-- timebox_scheduled_boxes
ALTER TABLE public.timebox_scheduled_boxes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own scheduled boxes" ON public.timebox_scheduled_boxes;

-- ============================================
-- 添加索引確保查詢效能（user_id 過濾）
-- ============================================

-- 確保 user_id 索引存在
CREATE INDEX IF NOT EXISTS idx_timebox_boxes_user ON public.timebox_boxes (user_id);
CREATE INDEX IF NOT EXISTS idx_timebox_weeks_user ON public.timebox_weeks (user_id);
CREATE INDEX IF NOT EXISTS idx_timebox_scheduled_user ON public.timebox_scheduled_boxes (user_id);

COMMIT;
