-- ─────────────────────────────────────────────────────────────────────────────
-- 代辦看板個人化 P4：指派配對卡（兩卡）+ 內容雙向同步 + 各自完成
--
-- 寫於：2026-05-29
-- 對應：workspace/架構整理/2026-05-29-代辦看板個人化-spec.md（P4）
--
-- 概念（William 定案）：指派 = 配對的兩張卡
--   - 建立者卡：assignee = created_by（自己）、在自己欄、linked_group_id = G
--   - 被指派卡：assignee = B、column_id = NULL（顯示在 B 的「任務指派」虛擬欄）、linked_group_id = G
--   - 內容（title/description/deadline/priority/sub_tasks/notes）雙向同步
--   - completed / status 各卡獨立（一方完成另一方不受影響）
--
-- 為何用 trigger：todos CRUD 走 entity hook 直接寫表、無 API 單一進出口、trigger 才能涵蓋所有入口。
-- 防禦：一般 todo（無指派 / 自己指派自己）完全不受影響；防遞迴用 pg_trigger_depth()。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- 1. 配對：指派給別人時、補建立者追蹤卡、把原卡設為被指派卡
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_todos_assignment_pairing()
RETURNS TRIGGER AS $$
DECLARE
  g UUID;
BEGIN
  -- 只處理「指派給別人、且尚未配對」的卡
  IF NEW.assignee IS NULL OR NEW.assignee = NEW.created_by THEN
    RETURN NEW;
  END IF;
  IF NEW.linked_group_id IS NOT NULL THEN
    RETURN NEW; -- 已配對（含我們自己補的建立者卡）
  END IF;

  g := gen_random_uuid();

  -- 原卡 → 被指派卡：掛 group、移出個人欄（改在虛擬欄顯示）
  UPDATE public.todos
    SET linked_group_id = g, column_id = NULL
    WHERE id = NEW.id;

  -- 補建立者追蹤卡（assignee = created_by、自己的板）
  INSERT INTO public.todos (
    title, description, priority, deadline, status, completed,
    assignee, visibility, related_items, sub_tasks, notes,
    enabled_quick_actions, task_type, tour_id,
    workspace_id, created_by, is_public, linked_group_id, column_id
  )
  SELECT
    NEW.title, NEW.description, NEW.priority, NEW.deadline, 'pending', false,
    NEW.created_by, ARRAY[NEW.created_by]::uuid[], NEW.related_items, NEW.sub_tasks, NEW.notes,
    NEW.enabled_quick_actions, NEW.task_type, NEW.tour_id,
    NEW.workspace_id, NEW.created_by, NEW.is_public, g, NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_todos_assignment_pairing ON public.todos;
CREATE TRIGGER trg_todos_assignment_pairing
  AFTER INSERT OR UPDATE OF assignee ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.fn_todos_assignment_pairing();

-- ════════════════════════════════════════════════════════════════════
-- 2. 內容雙向同步：同 linked_group_id 的卡、鏡像內容欄（不含 completed/status/column_id）
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_todos_content_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.linked_group_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- 防遞迴：只在使用者直接更新（depth=1）時鏡像、我們自己的鏡像更新（depth>1）不再觸發
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  UPDATE public.todos
    SET title = NEW.title,
        description = NEW.description,
        deadline = NEW.deadline,
        priority = NEW.priority,
        sub_tasks = NEW.sub_tasks,
        notes = NEW.notes
    WHERE linked_group_id = NEW.linked_group_id
      AND id <> NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_todos_content_sync ON public.todos;
CREATE TRIGGER trg_todos_content_sync
  AFTER UPDATE OF title, description, deadline, priority, sub_tasks, notes ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.fn_todos_content_sync();

-- ════════════════════════════════════════════════════════════════════
-- 3. 刪除連動：刪「建立者卡」(assignee=created_by) → 整組刪；刪「被指派卡」→ 只刪自己
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_todos_pair_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.linked_group_id IS NULL THEN
    RETURN OLD;
  END IF;
  IF pg_trigger_depth() > 1 THEN
    RETURN OLD; -- 連動刪除本身不再觸發
  END IF;
  -- 只有刪「建立者卡」才連動刪整組（被指派者刪自己 = 移除/拒絕、不影響建立者）
  IF OLD.assignee = OLD.created_by THEN
    DELETE FROM public.todos
      WHERE linked_group_id = OLD.linked_group_id AND id <> OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_todos_pair_delete ON public.todos;
CREATE TRIGGER trg_todos_pair_delete
  AFTER DELETE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.fn_todos_pair_delete();

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_todos_assignment_pairing ON public.todos;
-- DROP TRIGGER IF EXISTS trg_todos_content_sync ON public.todos;
-- DROP TRIGGER IF EXISTS trg_todos_pair_delete ON public.todos;
-- DROP FUNCTION IF EXISTS public.fn_todos_assignment_pairing();
-- DROP FUNCTION IF EXISTS public.fn_todos_content_sync();
-- DROP FUNCTION IF EXISTS public.fn_todos_pair_delete();
-- COMMIT;
