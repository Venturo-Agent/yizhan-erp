-- ============================================
-- 補 FK 防呆：todos.column_id → todo_columns.id ON DELETE SET NULL
-- ============================================
--
-- 為什麼：
--   2026-05-17 排查發現 production 上 todos.column_id 沒有 FK 約束
--   （20260412100000 本地 migration 寫過、但 20260510180000 hotfix 重建
--    todo_columns 時沒帶回來、所以 production 真實 schema 缺這條 FK）。
--
-- 後果：
--   刪 todo_columns row 時、底下的 todos 不會自動清 column_id、變孤兒。
--   page.tsx:113-125 的看板分組邏輯 `if (colId && map[colId])` 因為孤兒
--   todo 的 column_id 對應不到任何 column、todo 在 UI 上完全消失。
--
-- 已知影響：
--   2026-05-17 CORNER workspace 撞到 3 筆孤兒（熊 / 23123 / 12321）、
--   救火時 service_role DELETE 清掉，再補這條 FK 防未來再發生。
--
-- 修法：
--   1. 先把任何剩餘的孤兒 column_id 清成 NULL（保險）
--   2. 補 FK：ON DELETE SET NULL（跟 20260412100000 原設計一致）
--
-- 影響範圍：
--   - 非破壞性（只加 FK、不刪 column / 不改既有資料）
--   - 跑完後 PostgREST schema cache 自動 reload（沒改 column）
--   - 之後再有人刪 todo_columns row、todos.column_id 會自動 SET NULL
-- ============================================

BEGIN;

-- 步驟 1：清掉任何殘留孤兒（保險、避免加 FK 失敗）
UPDATE public.todos
SET column_id = NULL
WHERE column_id IS NOT NULL
  AND column_id NOT IN (SELECT id FROM public.todo_columns);

-- 步驟 2：補 FK constraint（如果已存在則先 drop 再加、確保最終狀態正確）
ALTER TABLE public.todos
  DROP CONSTRAINT IF EXISTS fk_todos_column_id;

ALTER TABLE public.todos
  ADD CONSTRAINT fk_todos_column_id
    FOREIGN KEY (column_id)
    REFERENCES public.todo_columns(id)
    ON DELETE SET NULL;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- ALTER TABLE public.todos DROP CONSTRAINT IF EXISTS fk_todos_column_id;
-- COMMIT;
