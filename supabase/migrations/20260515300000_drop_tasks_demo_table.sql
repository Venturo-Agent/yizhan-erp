-- ════════════════════════════════════════════════════════════════════
-- DROP TABLE public.tasks（12 筆 demo seed 資料、無真實營運用途）
--
-- 為什麼：
--   2026-05-15 SSOT 盤點發現 tasks vs todos 兩張表 enum 不一致：
--     tasks  → done / in-progress / todo
--     todos  → completed / in_progress / pending
--   進一步調查確認：
--   1. tasks 表 12 筆全是 2026-03-09 demo seed（assignee 是 'Ethan'/'Nova'/'Matthew'、
--      不是真實 employee id、workspace_id 是初始 a89335d4-... demo workspace）
--   2. /api/tasks/create route schema 跟 tasks 表完全對不上（寫 title 但表是 name 欄）、
--      call 一次就炸、是 dead API、grep 無 caller
--   3. 真正的 Kanban 待辦是 todos 表
--
--   William 2026-05-15 拍板 A：砍 tasks 表 + 砍 route
--
-- 影響：
--   - DROP TABLE 連帶清 4 條 RLS policy（tasks_select/insert/update/delete）
--   - 同時要砍 /api/tasks/create/route.ts（本 migration 後手動 rm）
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- 修前先記錄 row 數（log only、便於審計）
DO $$
DECLARE
  row_count INT;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.tasks;
  RAISE NOTICE 'About to DROP TABLE public.tasks with % rows (demo seed)', row_count;
END $$;

DROP TABLE IF EXISTS public.tasks CASCADE;

COMMIT;

-- ════ Rollback ════
-- 注意：DROP TABLE 含 12 筆 demo seed 無法 rollback、要重 seed
-- 若需要恢復：重跑原始 seed migration（搜 'tasks' 早期 seed migration）
