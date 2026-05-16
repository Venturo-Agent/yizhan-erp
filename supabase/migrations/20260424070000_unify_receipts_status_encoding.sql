-- =============================================
-- Migration: receipts.status 編碼統一 '0'/'1' → 'pending'/'confirmed'
-- Date: 2026-04-24
--
-- ⚠️ 此 migration 必須在 deploy 後才執行
-- 因為線上 code 在 deploy 前還用 '0'/'1' 比對、跑了會炸
--
-- 背景：
--   receipts.status 用 '0' (待確認) / '1' (已確認)
--   payment_requests.status 用 'pending' / 'confirmed' / 'billed'
--   兩種編碼不一致、未來損益表 join 兩邊資料會錯。
--   統一改用 receipts 跟 payment_requests 一致的英文 enum。
--
-- 驗證 (跑前):
--   SELECT status, count(*) FROM receipts GROUP BY status;
--   預期: '0' = 17, '1' = 3 (現況、可能變動)
--
-- 對應:
--   '0' → 'pending'   (待確認)
--   '1' → 'confirmed' (已確認)
--
-- 配套: code 已 deploy 用 'pending'/'confirmed' (commit XXX)
--
-- 加 CHECK constraint 限制 status 只能是 enum、防未來再寫進 '0'/'1'
--
-- Rollback: 見同目錄 .ROLLBACK.sql
-- =============================================

BEGIN;

-- 0. 先拔掉舊的 CHECK constraint（限定 '0'/'1'/'2'、會擋 UPDATE）
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_status_check;

-- 1. 更新現有 row
UPDATE public.receipts
SET status = 'pending'
WHERE status = '0';

UPDATE public.receipts
SET status = 'confirmed'
WHERE status = '1';

-- 2. 加新 CHECK constraint
ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled'));

-- 3. 驗證 0 殘留
DO $$
DECLARE
  legacy_count int;
BEGIN
  SELECT count(*) INTO legacy_count
  FROM public.receipts
  WHERE status IN ('0', '1');
  IF legacy_count > 0 THEN
    RAISE EXCEPTION '預期 0 個 legacy status row、實際 %', legacy_count;
  END IF;
END $$;

COMMIT;
