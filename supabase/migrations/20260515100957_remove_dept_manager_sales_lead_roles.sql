-- ─────────────────────────────────────────────────────────────────────────────
-- 拿掉預設「部門主管」+「業務主管」職務
--
-- 寫於：2026-05-15 10:09（Robin、男僕）
--
-- 背景：
--   2026-05-14 RBAC 改造（migration 20260514050000_rbac_abac_redesign.sql）
--   加了 6 個預設職務：系統管理員 / 部門主管 / 業務主管 / 業務 / 會計 / 助理。
--   William 5/15 拍板「先把預設的部門主管 / 業務主管拿掉」、留 4 個簡單預設。
--
-- 改動：
--   1. seed_new_workspace function 改寫、不再 seed 這兩個 role（新 workspace 只 4 個）
--   2. DELETE 既有 workspaces 的這 2 條 role row（沒員工 assign 才安全）
--      → 有員工 assign 會撞 FK constraint、migration 失敗、需要先 reassign
--
-- 4 個保留的預設職務：
--   - 系統管理員（最高權限）
--   - 業務（一線、自己 scope）
--   - 會計（讀寫所有人）
--   - 助理（一線、自己 scope）
--
-- 「主管」概念不消失、只是不預設、租戶 admin 可在 /hr/roles 自己加。
--
-- 紀律：
--   - DELETE 既有資料前 check 沒員工 assign、否則 raise exception 中止 migration
--   - reassign 邏輯不寫進 migration、由 user 在 UI 處理（避免誤殺）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════ 1. 改寫 seed_new_workspace function（4 個預設職務）════

CREATE OR REPLACE FUNCTION public.seed_new_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 4 個預設職務（William 2026-05-15 簡化）
  INSERT INTO public.workspace_roles (workspace_id, name, description, is_admin, sort_order) VALUES
    (NEW.id, '系統管理員', '工作空間最高權限、預留給老闆 / 創辦人。讀寫所有人、所有分公司、所有部門。', true, 1),
    (NEW.id, '業務', '一線業務、讀寫自己。', false, 2),
    (NEW.id, '會計', '會計 / 財務、讀寫所有人（做帳必要）。', false, 3),
    (NEW.id, '助理', '一線助理、讀寫自己。', false, 4);

  -- 第一個分公司
  INSERT INTO public.branches (workspace_id, name, code, type, is_default, is_active, display_order)
  VALUES (NEW.id, NEW.name, 'HQ', 'headquarters', true, true, 1);

  -- 第一個部門
  INSERT INTO public.departments (workspace_id, name, code, type, is_default, is_active, display_order)
  VALUES (NEW.id, '總部', 'HQ', 'headquarters', true, true, 1);

  RETURN NEW;
END;
$$;

-- ════ 2. 安全檢查：是否有員工被 assign 到「部門主管」或「業務主管」========
DO $$
DECLARE
  v_assigned_count int;
  v_assigned_workspaces text;
BEGIN
  SELECT count(*), string_agg(DISTINCT w.name, ', ')
    INTO v_assigned_count, v_assigned_workspaces
    FROM public.employees e
    JOIN public.workspace_roles wr ON wr.id = e.role_id
    JOIN public.workspaces w ON w.id = e.workspace_id
   WHERE wr.name IN ('部門主管', '業務主管');

  IF v_assigned_count > 0 THEN
    RAISE EXCEPTION
      '有 % 位員工已 assign 到「部門主管」或「業務主管」role（在 workspace: %）。
       請先在 UI 把這些員工 reassign 給其他 role、再跑這個 migration。',
      v_assigned_count, v_assigned_workspaces;
  END IF;
END $$;

-- ════ 3. DELETE 既有 workspaces 的這 2 條 role row ====================
DELETE FROM public.workspace_roles
 WHERE name IN ('部門主管', '業務主管');

-- ════ 驗證 ════
DO $$
DECLARE
  v_remaining int;
BEGIN
  SELECT count(*) INTO v_remaining
    FROM public.workspace_roles
   WHERE name IN ('部門主管', '業務主管');

  IF v_remaining > 0 THEN
    RAISE EXCEPTION '還有 % 條「部門主管」/「業務主管」role 沒被刪、檢查',
      v_remaining;
  END IF;

  RAISE NOTICE '✓ seed_new_workspace function 改成 4 個預設職務';
  RAISE NOTICE '✓ 既有 workspaces 的「部門主管」/「業務主管」role 已 DELETE';
END $$;

COMMIT;

-- ════ Rollback（萬一要還原這 2 個 role）════
-- BEGIN;
-- INSERT INTO public.workspace_roles (workspace_id, name, description, is_admin, sort_order)
-- SELECT w.id, '部門主管',
--        '看部門內所有人、但不改別人資料（嚴格預設）。',
--        false,
--        COALESCE((SELECT max(sort_order) + 1 FROM public.workspace_roles WHERE workspace_id = w.id), 2)
--   FROM public.workspaces w
--  WHERE NOT EXISTS (
--    SELECT 1 FROM public.workspace_roles wr
--     WHERE wr.workspace_id = w.id AND wr.name = '部門主管'
--  );
-- INSERT INTO public.workspace_roles (workspace_id, name, description, is_admin, sort_order)
-- SELECT w.id, '業務主管',
--        '看部門內所有人 + 能改別人（寫入跨人）。',
--        false,
--        COALESCE((SELECT max(sort_order) + 1 FROM public.workspace_roles WHERE workspace_id = w.id), 3)
--   FROM public.workspaces w
--  WHERE NOT EXISTS (
--    SELECT 1 FROM public.workspace_roles wr
--     WHERE wr.workspace_id = w.id AND wr.name = '業務主管'
--  );
-- -- 還要改 seed_new_workspace function 加回這 2 條 INSERT
-- COMMIT;
