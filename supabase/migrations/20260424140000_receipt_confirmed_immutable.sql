-- =============================================
-- Migration: receipts confirmed 不可改回 pending / 不可刪除 (🟠 #12)
-- Date: 2026-04-24
--
-- ⚠️ 跟 20260424070000_unify_receipts_status_encoding 一起 apply 最好 (該 migration 把 '0'/'1' 改成 'pending'/'confirmed')
-- 但也可以先 apply 本 trigger、舊值 '1' 也會被擋
--
-- 背景:
--   會計紅線: 已確認的收款單不該回頭改 status (改回 pending) 或刪除。
--   審計上需要不可逆、避免改壞帳後無痕可追。
--
-- 機制:
--   BEFORE UPDATE/DELETE trigger on receipts
--   - UPDATE: 如果 OLD.status 已確認、NEW.status 改成非確認 → RAISE 除非 admin
--   - DELETE: 如果 OLD.status 已確認 → RAISE 除非 admin
--   - 同時認 '1' (舊編碼) 跟 'confirmed' (新編碼) 過渡期安全
--
-- Admin 例外: is_super_admin() true 的可以 override (緊急救援)
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.receipt_confirmed_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  is_old_confirmed boolean;
  is_new_confirmed boolean;
BEGIN
  -- 兼容 '1' (舊) + 'confirmed' (新) 兩種編碼
  is_old_confirmed := OLD.status IN ('1', 'confirmed');

  IF TG_OP = 'DELETE' THEN
    IF is_old_confirmed AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION '已確認的收款單不可刪除 (receipt_number=%)、需擁有平台管理資格', OLD.receipt_number;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    is_new_confirmed := NEW.status IN ('1', 'confirmed');
    -- 從確認 → 非確認、擋 (除非 admin)
    IF is_old_confirmed AND NOT is_new_confirmed AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION '已確認的收款單不可改回未確認 (receipt_number=%)、需擁有平台管理資格', OLD.receipt_number;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tg_receipt_confirmed_immutable ON public.receipts;
CREATE TRIGGER tg_receipt_confirmed_immutable
  BEFORE UPDATE OR DELETE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.receipt_confirmed_immutable();

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM pg_trigger WHERE tgname = 'tg_receipt_confirmed_immutable';
  IF c = 0 THEN RAISE EXCEPTION 'trigger 沒建出來'; END IF;
END $$;

COMMIT;
