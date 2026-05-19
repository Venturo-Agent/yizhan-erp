-- ============================================================
-- Migration: 紅線 B FK 修正 — created_by/updated_by（Round 7 訂正版）
--           原 Round 4 OPENCLAW migration 是 false positive、
--           本檔改寫為 idempotent + EXISTS 守門、未來 db push 安全。
--
-- 真相（Round 7 用 MCP 連 production 查證）：
--   • tour_control_forms — table 不存在於 production（migration 檔有寫但沒 apply）
--   • folders / files — table 不存在於 production
--   • image_library.created_by — 已經正確指 employees(id)（5/13 紅線 B 修法早改）
--
-- 結論：本 migration 對現況 = no-op。但仍保留 EXISTS 守門 SQL、
--       供未來 tour_control_forms / folders / files 表如真被建立時自動補上正確 FK。
--
-- Author: Round 4 OPENCLAW（原版） + Round 7 Claude Opus（訂正）
-- Date:   2026-05-20
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. tour_control_forms（表不存在於 production、本段 = no-op）
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tour_control_forms'
  ) THEN
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
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. image_library（表存在、FK 已是 employees、ADD IF NOT EXISTS 守門）
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'image_library'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'image_library'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'employees'
      AND ccu.column_name = 'id'
  ) THEN
    ALTER TABLE public.image_library
      DROP CONSTRAINT IF EXISTS image_library_created_by_fkey,
      ADD CONSTRAINT image_library_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;

    COMMENT ON CONSTRAINT image_library_created_by_fkey ON public.image_library
      IS '紅線 B 修正：圖庫圖片建立者為員工（employees.id）';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. file_system.folders（表不存在於 production、本段 = no-op）
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'folders'
  ) THEN
    ALTER TABLE public.folders
      DROP CONSTRAINT IF EXISTS folders_created_by_fkey,
      ADD CONSTRAINT folders_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;

    COMMENT ON CONSTRAINT folders_created_by_fkey ON public.folders
      IS '紅線 B 修正：資料夾建立者為員工（employees.id）';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. file_system.files（表不存在於 production、本段 = no-op）
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'files'
  ) THEN
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
  END IF;
END $$;

COMMIT;

-- ============================================================
-- Round 7 訂正紀錄（2026-05-20 07:30）：
--   原 Round 4 migration（無 EXISTS 守門）apply 會 fail。
--   Claude Opus 用 MCP 查 production 後發現：
--   - 3 表（tour_control_forms / folders / files）根本不存在
--   - image_library.created_by 已經是 employees（5/13 修過）
--   本訂正版讓 migration 變 idempotent + 對「表不存在」safe。
-- ============================================================
