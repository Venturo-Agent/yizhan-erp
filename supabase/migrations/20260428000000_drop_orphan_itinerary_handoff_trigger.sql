-- 2026-04-28: 砍 itineraries.itinerary_handoff_check 孤兒 trigger
--
-- Bug：行程頁面 UPDATE 失敗、報「relation tour_confirmation_sheets does not exist」
--
-- Root cause：
--   trigger itinerary_handoff_check（BEFORE UPDATE on itineraries）會 SELECT
--   tour_confirmation_sheets 表、但這張表已在「confirmation-sheet」dead feature
--   清理時砍掉（commit 7aa42989b 周圍）。trigger 跟 function 沒同時砍 →
--   每次行程 UPDATE 都會 raise exception → 使用者看到「存檔失敗」。
--
-- 影響：
--   - 行程頁面（/tours/[code] 行程 tab）所有「修改既有行程」全部失敗
--   - 建立新行程不受影響（trigger 只 hook UPDATE 不 hook INSERT）
--
-- 修法：
--   砍 trigger + 砍 function（孤兒、無人 reference）
--
-- 紅線檢查：
--   ✅ 不刪 row、不改 row 值
--   ✅ 不 DROP 任何表
--   ✅ 不改既有 column 型別
--   ✅ 純粹清掉指向不存在表的死 trigger

BEGIN;

DROP TRIGGER IF EXISTS itinerary_handoff_check ON public.itineraries;
DROP FUNCTION IF EXISTS public.check_itinerary_handoff_status();

COMMIT;
