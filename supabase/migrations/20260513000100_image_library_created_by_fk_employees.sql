-- ─────────────────────────────────────────────────────────────────────────────
-- B13: image_library 補紅線 B FK（created_by → employees(id)）
--
-- 背景：
--   Pattern audit 寫 3 表（email_system / tour_control_forms / image_library）
--   created_by 指 auth.users(id)、違反紅線 B。
--   pre-check 發現：
--     - email_system / tour_control_forms 表根本不存在於 production
--     - image_library 表存在但 0 row、且現有 0 FK constraint（migration 寫了沒套）
--
--   所以 B13 真正要做的：只動 image_library、加上「指向 employees(id)」的 FK。
--   不用 truncate（0 row）。
--
-- 風險：低、純加 constraint、0 row 影響。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Pre-check：確認 0 row（不然影響 0 row 的假設不成立）
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.image_library;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'image_library 有 % row、不在 B13 預期範圍內、停止', v_count;
  END IF;
END $$;

-- 確認 column 存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='image_library' AND column_name='created_by'
  ) THEN
    RAISE EXCEPTION 'image_library.created_by column 不存在';
  END IF;
END $$;

-- 先 drop 任何既存的 created_by FK（防衝突、idempotent）
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='public.image_library'::regclass
      AND contype='f' AND conname LIKE '%created_by%'
  LOOP
    EXECUTE format('ALTER TABLE public.image_library DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE '  ↳ dropped existing FK: %', r.conname;
  END LOOP;
END $$;

-- 加正確 FK：指 employees(id)、紅線 B 規定
ALTER TABLE public.image_library
  ADD CONSTRAINT image_library_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.employees(id)
  ON DELETE SET NULL;

DO $$
BEGIN
  RAISE NOTICE '✓ B13 完成：image_library.created_by FK 改指 employees(id)';
  RAISE NOTICE '  (email_system / tour_control_forms 表不存在於 production、不處理)';
END $$;

COMMIT;
