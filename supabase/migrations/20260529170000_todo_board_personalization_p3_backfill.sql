-- ─────────────────────────────────────────────────────────────────────────────
-- 代辦看板個人化 P3：既有共用欄 → 每人個人欄、todos 重映、刪共用欄
--
-- 寫於：2026-05-29
-- 對應：workspace/架構整理/2026-05-29-代辦看板個人化-spec.md
-- Why：todo_columns 原本全 workspace 共用。改 per-user 後、每位 active 員工先各拿一份
--   目前共用欄當起點（保留現有版面、之後自己改）；todos 依 creator 重映到他的個人欄。
--
-- 相依：API GET 已改「owner=我 OR owner is null」相容（先部署 code、再跑此 backfill、零空窗）。
-- 紀律：idempotent（NOT EXISTS 防重複複製）、先 remap todos 再刪共用欄（避開 column_id FK）。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. 每個 (workspace, active employee) 複製該 workspace 的共用欄（owner-null）成個人欄
INSERT INTO public.todo_columns (workspace_id, owner_employee_id, name, color, sort_order, is_system)
SELECT c.workspace_id, e.id, c.name, c.color, c.sort_order, false
FROM public.todo_columns c
JOIN public.employees e
  ON e.workspace_id = c.workspace_id AND e.is_active = true
WHERE c.owner_employee_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.todo_columns x
    WHERE x.workspace_id = c.workspace_id AND x.owner_employee_id = e.id
      AND x.name = c.name AND x.sort_order = c.sort_order
  );

-- 2. todos.column_id 重映到「建立者的個人欄」（同 workspace + 同名 + 同 sort_order）
UPDATE public.todos t
SET column_id = pc.id
FROM public.todo_columns oldc
JOIN public.todo_columns pc
  ON pc.workspace_id = oldc.workspace_id
 AND pc.owner_employee_id = t.created_by
 AND pc.name = oldc.name
 AND pc.sort_order = oldc.sort_order
WHERE t.column_id = oldc.id
  AND oldc.owner_employee_id IS NULL;

-- 3. 仍指向共用欄的 todo（建立者非 active、無對應個人欄）→ column_id NULL（落未分欄）
UPDATE public.todos
SET column_id = NULL
WHERE column_id IN (SELECT id FROM public.todo_columns WHERE owner_employee_id IS NULL);

-- 4. 刪除舊共用欄（已無 todo 指向）
DELETE FROM public.todo_columns WHERE owner_employee_id IS NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback：無法完美還原（共用欄已拆成個人欄）。若要回退、需從備份還原 todo_columns。 ════
