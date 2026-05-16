-- =============================================
-- Migration: 加 3 個團類型 outsource / visa / esim 進 tours.tour_service_type CHECK constraint
-- Date: 2026-05-11
--
-- Why：陸續加新團類型（旅遊團 / 機票 / 機加酒 / 訂房 / 外丟團 / 簽證 / 網卡）
--   visa 之前 CHECK 已有、code 層 type union 沒有
--   outsource / esim 全新（esim 在 code type union 已有、CHECK 沒有）
--
-- 改法：drop 舊 CHECK、加新 CHECK 含 outsource / visa / esim
--   保留既有值不動、idempotent（用 conname 判斷）
-- =============================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tour_service_type'
  ) THEN
    ALTER TABLE public.tours DROP CONSTRAINT chk_tour_service_type;
  END IF;

  ALTER TABLE public.tours
    ADD CONSTRAINT chk_tour_service_type
    CHECK (tour_service_type IN (
      'flight',
      'flight_hotel',
      'hotel',
      'car_service',
      'tour_group',
      'visa',
      'outsource',
      'esim'
    ));
END$$;

COMMENT ON COLUMN public.tours.tour_service_type IS
  '團服務類型：flight(機票), flight_hotel(機加酒), hotel(訂房), car_service(派車), tour_group(旅遊團), visa(簽證), outsource(外丟團), esim(網卡)';

-- 驗證：新 CHECK 真有 outsource / esim
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'tours' AND c.conname = 'chk_tour_service_type';

  IF v_def IS NULL OR v_def NOT LIKE '%outsource%' OR v_def NOT LIKE '%esim%' THEN
    RAISE EXCEPTION 'chk_tour_service_type 沒含 outsource / esim、migration 失敗 — 實際定義：%', v_def;
  END IF;
END$$;

COMMIT;
