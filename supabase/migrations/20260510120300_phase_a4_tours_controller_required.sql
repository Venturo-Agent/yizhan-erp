-- ─────────────────────────────────────────────────────────────────────────────
-- Phase A4: tours.controller_id 改 NOT NULL（必填）
--
-- 目的：William 拍板 — 每個團都必須有團控（controller_id）。歷史 migration
--   `20260409590000_controller_id_nullable.sql` 把 controller_id 改成可空、
--   現在收回、強制必填。
--
-- 業務語意：
--   - 團控 = 控整團的負責人（業務 / OP / 業務組長 …）
--   - scope_visible 重度依賴 controller_id（業務看自己當 controller 的團）
--   - 若 controller_id NULL → scope_visible 邏輯退化、權限混亂
--
-- 安全機制：
--   - apply 前先檢查既有 NULL 數量、有 NULL → RAISE EXCEPTION 停下、
--     提示 William 先補資料再 retry（避免悄悄炸資料）
--   - 補資料 SQL 範例：
--     UPDATE tours SET controller_id = '<某員工 id>' WHERE controller_id IS NULL;
--   - 補完再 apply 這條 migration
--
-- 配套（不在這條 migration、屬於 application code）：
--   - UI 建團 form 改 controller 必填
--   - API route /api/tours POST 守門：req.body.controller_id 必須存在
--   - 既有 form 沒填的 default 值處理（建議：當前登入員工為預設）
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. 檢查既有 NULL row
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_null_count INT;
  v_backfilled INT;
  v_remaining INT;
BEGIN
  -- Step 1：盤點 NULL row 數量
  SELECT COUNT(*) INTO v_null_count
  FROM public.tours
  WHERE controller_id IS NULL;

  RAISE NOTICE '盤點：tours.controller_id 有 % 筆 NULL row', v_null_count;

  -- Step 2：自動 backfill — 用 created_by 當 controller_id（合理 fallback）
  IF v_null_count > 0 THEN
    UPDATE public.tours
    SET controller_id = created_by
    WHERE controller_id IS NULL
      AND created_by IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = public.tours.created_by
      );

    GET DIAGNOSTICS v_backfilled = ROW_COUNT;
    RAISE NOTICE '✓ 自動 backfill：% 筆團、controller_id 設為 created_by', v_backfilled;
  END IF;

  -- Step 3：再次檢查、如還有 NULL（created_by 也是 NULL 的孤兒團）→ 停下
  SELECT COUNT(*) INTO v_remaining
  FROM public.tours
  WHERE controller_id IS NULL;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION
      'tours.controller_id 還有 % 筆 NULL row 無法自動 backfill（created_by 也是 NULL 或對不到 employee）。'
      || E'\n手動補：'
      || E'\n  -- 看哪些孤兒團'
      || E'\n  SELECT id, code, name, workspace_id, created_by FROM public.tours WHERE controller_id IS NULL;'
      || E'\n  -- 各別補（依該 workspace 任一現職員工）'
      || E'\n  UPDATE public.tours SET controller_id = ''<員工 UUID>'' WHERE id = ''<tour-id>'';'
      || E'\n補完再 retry 這條 migration。',
      v_remaining;
  END IF;

  RAISE NOTICE '✓ tours.controller_id 無 NULL row、可安全 ALTER NOT NULL';
END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. ALTER NOT NULL
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tours
  ALTER COLUMN controller_id SET NOT NULL;

COMMENT ON COLUMN public.tours.controller_id IS
  '團控 — 控整團的負責人 employee.id。NOT NULL 由 Phase A4 強制（William 拍板必填）。歷史 migration `20260409590000_controller_id_nullable.sql` 一度改可空、A4 收回。';

-- ═════════════════════════════════════════════════════════════════════════════
-- 完工提示
-- ═════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ Phase A4 完成：tours.controller_id 已強制 NOT NULL';
  RAISE NOTICE '⚠️  配套要做：UI 建團 form 必填、API POST validation';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;
