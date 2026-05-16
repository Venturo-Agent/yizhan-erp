-- =============================================
-- Migration: journal_vouchers 加借貸平衡 DB CHECK constraint
-- Date: 2026-04-24
--
-- 背景：
--   會計傳票借貸必平衡 (total_debit = total_credit)。
--   前端 + 後端都有驗、但 DB 沒守、SQL 直 INSERT / UPDATE 仍能寫進不平的 row。
--   ERP / AI / admin script / Supabase Studio 手動操作都繞過應用層驗證。
--   此 constraint 把驗證下推到 DB 層、是會計帳的最後守門員。
--
-- 容差：< 0.01（NT$0.01、保留四捨五入誤差）
-- NULL 處理：COALESCE 把 NULL 視為 0（早期 row 可能某邊 NULL）
--
-- 影響：
--   現有 11 row 已驗證 0 不平、constraint 加上去不會擋到既有資料。
--   未來任何寫入 / 更新如果借貸不平差異 >= 0.01 會被 DB rejected。
--
-- Rollback:
--   見同目錄 .ROLLBACK.sql
-- =============================================

BEGIN;

ALTER TABLE public.journal_vouchers
  ADD CONSTRAINT journal_vouchers_balance_check
  CHECK (abs(COALESCE(total_debit, 0) - COALESCE(total_credit, 0)) < 0.01);

-- 驗證 constraint 真的有附上
DO $$
DECLARE
  c int;
BEGIN
  SELECT count(*) INTO c
  FROM information_schema.table_constraints
  WHERE table_schema='public'
    AND table_name='journal_vouchers'
    AND constraint_name='journal_vouchers_balance_check'
    AND constraint_type='CHECK';
  IF c <> 1 THEN
    RAISE EXCEPTION '預期 1 個 CHECK constraint、實際 %', c;
  END IF;
END $$;

COMMIT;
