-- =============================================
-- 新增「待取消」狀態到 tour_requests
-- =============================================

-- 更新狀態註解，說明所有可用狀態
COMMENT ON COLUMN public.tour_requests.status IS '狀態：pending(待作業)/sent(已發送)/replied(已回覆)/confirmed(已確認)/pending_cancel(待取消)/cancelled(已取消)';

-- 注意：PostgreSQL 的 VARCHAR 不需要 ALTER 來增加新的狀態值
-- 只要應用程式使用新的值即可
