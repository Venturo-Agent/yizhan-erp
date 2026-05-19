-- ════════════════════════════════════════════════════════════════
-- 目的：修「新增模板旅遊團失敗」bug + 對齊「模板是 workspace-level、不綁分公司」業務語意
-- ════════════════════════════════════════════════════════════════
--
-- 業務脈絡：
-- - 旅遊團模板（status='template'）是樣板、不是真實成立的團、跨分公司共用
-- - 過去 trigger fn_default_branch_id 自動把員工的 branch_id 填進模板、導致：
--   1. 模板被綁分公司（業務語意錯誤）
--   2. 沒有 cross_branch.write capability 的員工建模板可能被 RLS 擋
--   3. 同一 workspace 不同分公司員工互看不到對方模板
--
-- 修法：
-- 1. trigger：status='template' 時、強制 branch_id=NULL（不自動填）
-- 2. 4 個 RLS policy（insert/select/update/delete）加 template 例外、模板 + branch_id IS NULL 在同 workspace 內任何員工都能操作
-- 3. 既有 5 筆 template、其中 2 筆有 branch_id、UPDATE 改成 NULL 統一語意
--
-- 譬喻：飯店的「房型範本」（template）是全公司共用的、不該綁某一家分店；
--      所有分店的櫃台都能拿來用、不需要「跨分店權限」。
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. trigger function：模板強制 branch_id=NULL ─────────────────
CREATE OR REPLACE FUNCTION public.fn_default_branch_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid;
  v_branch uuid;
BEGIN
  -- 模板：workspace-level、不綁分公司、強制 branch_id=NULL（即使 caller 帶了）
  IF NEW.status = 'template' THEN
    NEW.branch_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.branch_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT branch_id INTO v_branch
  FROM public.employees WHERE user_id = v_uid LIMIT 1;

  IF v_branch IS NOT NULL THEN
    NEW.branch_id := v_branch;
  END IF;

  RETURN NEW;
END;
$function$;

-- ── 2. 重建 4 個 RLS policy、加 template 例外 ────────────────────

-- SELECT：原本就因 can_access_branch(NULL, 'cross_branch.read') 而對 NULL branch 放行
-- 不需改、保留原狀

-- INSERT：加 template 例外
DROP POLICY IF EXISTS tours_insert ON public.tours;
CREATE POLICY tours_insert ON public.tours
FOR INSERT
WITH CHECK (
  workspace_id = get_current_user_workspace() AND (
    (status = 'template' AND branch_id IS NULL)
    OR can_access_branch(branch_id, 'cross_branch.write')
  )
);

-- UPDATE：加 template 例外（using + with_check 都要）
DROP POLICY IF EXISTS tours_update ON public.tours;
CREATE POLICY tours_update ON public.tours
FOR UPDATE
USING (
  workspace_id = get_current_user_workspace() AND (
    (status = 'template' AND branch_id IS NULL)
    OR can_access_branch(branch_id, 'cross_branch.write')
  )
)
WITH CHECK (
  workspace_id = get_current_user_workspace() AND (
    (status = 'template' AND branch_id IS NULL)
    OR can_access_branch(branch_id, 'cross_branch.write')
  )
);

-- DELETE：加 template 例外
DROP POLICY IF EXISTS tours_delete ON public.tours;
CREATE POLICY tours_delete ON public.tours
FOR DELETE
USING (
  workspace_id = get_current_user_workspace() AND (
    (status = 'template' AND branch_id IS NULL)
    OR can_access_branch(branch_id, 'cross_branch.write')
  )
);

-- ── 3. 既有 template 資料、把 branch_id 統一改 NULL ──────────────
-- 過去 trigger 把 branch_id 自動填進去、現在改回 NULL 對齊新業務語意
UPDATE public.tours
SET branch_id = NULL
WHERE status = 'template' AND branch_id IS NOT NULL;

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）
-- ════════════════════════════════════════════════════════════════
-- BEGIN;
-- -- 還原 trigger（不分 template）
-- CREATE OR REPLACE FUNCTION public.fn_default_branch_id()
-- RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
-- AS $$ DECLARE v_uid uuid; v_branch uuid; BEGIN
--   IF NEW.branch_id IS NOT NULL THEN RETURN NEW; END IF;
--   v_uid := auth.uid();
--   IF v_uid IS NULL THEN RETURN NEW; END IF;
--   SELECT branch_id INTO v_branch FROM public.employees WHERE user_id = v_uid LIMIT 1;
--   IF v_branch IS NOT NULL THEN NEW.branch_id := v_branch; END IF;
--   RETURN NEW;
-- END; $$;
-- -- 還原 3 個 RLS policy（拿掉 template 例外）
-- DROP POLICY IF EXISTS tours_insert ON public.tours;
-- CREATE POLICY tours_insert ON public.tours FOR INSERT WITH CHECK ((workspace_id = get_current_user_workspace()) AND can_access_branch(branch_id, 'cross_branch.write'::text));
-- DROP POLICY IF EXISTS tours_update ON public.tours;
-- CREATE POLICY tours_update ON public.tours FOR UPDATE USING ((workspace_id = get_current_user_workspace()) AND can_access_branch(branch_id, 'cross_branch.write'::text)) WITH CHECK ((workspace_id = get_current_user_workspace()) AND can_access_branch(branch_id, 'cross_branch.write'::text));
-- DROP POLICY IF EXISTS tours_delete ON public.tours;
-- CREATE POLICY tours_delete ON public.tours FOR DELETE USING ((workspace_id = get_current_user_workspace()) AND can_access_branch(branch_id, 'cross_branch.write'::text));
-- COMMIT;
