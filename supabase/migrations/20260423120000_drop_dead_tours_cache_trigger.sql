-- ============================================================================
-- 修正：trigger_tour_update_cache 指向已 drop 的 traveler_tour_cache 表
-- ============================================================================
--
-- 背景：
--   2026-04-22 的 20260422330000_drop_8_groups_orphans.sql 用 CASCADE drop 掉了
--   traveler_tour_cache 表（以及 traveler_profiles 等 traveler_* 系列空表）、
--   但 cache refresh trigger 和對應的 function 沒有一起清掉。
--
-- 後果：
--   tours 表任何 UPDATE 都會觸發 trigger_tour_update_cache、
--   該 trigger 執行 auto_refresh_cache_on_tour_update() 函數、
--   函數嘗試 UPDATE 已經不存在的 traveler_tour_cache 表、
--   整個 UPDATE 被回滾、錯誤：relation "traveler_tour_cache" does not exist。
--
-- 動作：
--   兩個都 drop。它們是 dead code、留著只擋所有 tour 更新操作。

DROP TRIGGER IF EXISTS trigger_tour_update_cache ON public.tours;
DROP FUNCTION IF EXISTS public.auto_refresh_cache_on_tour_update();
