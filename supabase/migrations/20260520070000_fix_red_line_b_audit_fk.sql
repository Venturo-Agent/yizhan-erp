-- ============================================================
-- Migration: 紅線 B FK 修正 — created_by/updated_by
--           從 auth.users(id) 改為 employees(id)
--
-- 適用範圍：
--   • tour_control_forms.created_by / updated_by
--   • image_library.created_by
--   • file_system.folders.created_by
--   • file_system.files.created_by / updated_by
--
-- 不適用（已正確）：
--   • email_accounts.owner_id → 已是 employees(id)
--
-- Author: Max (OPENCLAW agent)
-- Date:   2026-05-20
-- Charter: Round 4 Sub-task B
--
-- 重要：請由 Claude Opus 覆查後，通過 MCP apply
-- ============================================================
-- Reverse SQL（如果需要 rollback）：
--   ALTER TABLE tour_control_forms
--     DROP CONSTRAINT IF EXISTS tour_control_forms_created_by_fkey,
--     DROP CONSTRAINT IF EXISTS tour_control_forms_updated_by_fkey,
--     ADD CONSTRAINT tour_control_forms_created_by_fkey
--       FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
--     ADD CONSTRAINT tour_control_forms_updated_by_fkey
--       FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
--
--   ALTER TABLE image_library
--     DROP CONSTRAINT IF EXISTS image_library_created_by_fkey,
--     ADD CONSTRAINT image_library_created_by_fkey
--       FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
--
--   ALTER TABLE folders
--     DROP CONSTRAINT IF EXISTS folders_created_by_fkey,
--     ADD CONSTRAINT folders_created_by_fkey
--       FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
--
--   ALTER TABLE files
--     DROP CONSTRAINT IF EXISTS files_created_by_fkey,
--     DROP CONSTRAINT IF EXISTS files_updated_by_fkey,
--     ADD CONSTRAINT files_created_by_fkey
--       FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
--     ADD CONSTRAINT files_updated_by_fkey
--       FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. tour_control_forms
-- ------------------------------------------------------------
ALTER TABLE public.tour_control_forms
  DROP CONSTRAINT IF EXISTS tour_control_forms_created_by_fkey,
  DROP CONSTRAINT IF EXISTS tour_control_forms_updated_by_fkey,
  ADD CONSTRAINT tour_control_forms_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD CONSTRAINT tour_control_forms_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT tour_control_forms_created_by_fkey ON public.tour_control_forms
  IS '紅線 B 修正：團控表建立者為員工（employees.id）';
COMMENT ON CONSTRAINT tour_control_forms_updated_by_fkey ON public.tour_control_forms
  IS '紅線 B 修正：團控表更新者為員工（employees.id）';

-- ------------------------------------------------------------
-- 2. image_library
-- ------------------------------------------------------------
ALTER TABLE public.image_library
  DROP CONSTRAINT IF EXISTS image_library_created_by_fkey,
  ADD CONSTRAINT image_library_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT image_library_created_by_fkey ON public.image_library
  IS '紅線 B 修正：圖庫圖片建立者為員工（employees.id）';

-- ------------------------------------------------------------
-- 3. file_system.folders
-- ------------------------------------------------------------
ALTER TABLE public.folders
  DROP CONSTRAINT IF EXISTS folders_created_by_fkey,
  ADD CONSTRAINT folders_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT folders_created_by_fkey ON public.folders
  IS '紅線 B 修正：資料夾建立者為員工（employees.id）';

-- ------------------------------------------------------------
-- 4. file_system.files
-- ------------------------------------------------------------
ALTER TABLE public.files
  DROP CONSTRAINT IF EXISTS files_created_by_fkey,
  DROP CONSTRAINT IF EXISTS files_updated_by_fkey,
  ADD CONSTRAINT files_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD CONSTRAINT files_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.employees(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT files_created_by_fkey ON public.files
  IS '紅線 B 修正：檔案建立者為員工（employees.id）';
COMMENT ON CONSTRAINT files_updated_by_fkey ON public.files
  IS '紅線 B 修正：檔案更新者為員工（employees.id）';

COMMIT;