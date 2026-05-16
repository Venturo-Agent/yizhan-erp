-- ─────────────────────────────────────────────────────────────────────────────
-- suppliers 加 usage_count counter column + 維護 trigger
-- 2026-05-13 黒羽 + William 拍板「常用排序」
--
-- 業務目的：供應商列表預設按使用次數降序、常用的排前面、長尾排後面
--
-- 範圍：只算 payment_request_items.supplier_id reference 數
--   - 排除 payment_requests / tour_itinerary_items / driver_tasks（業務含義不同）
--   - 之後若要含括其他表、加 trigger 即可
--
-- 設計：
--   1. ALTER suppliers ADD COLUMN usage_count INTEGER DEFAULT 0 NOT NULL
--   2. backfill：UPDATE suppliers SET usage_count = (SELECT count(*) ... )
--   3. AFTER trigger on payment_request_items：INSERT/UPDATE/DELETE 自動 +- 1
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. 加欄位
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.suppliers.usage_count IS
  '使用次數（payment_request_items.supplier_id 出現次數、AFTER trigger 維護）';

-- 2. backfill 現有資料
UPDATE public.suppliers s
SET usage_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT supplier_id, count(*)::int AS cnt
  FROM public.payment_request_items
  WHERE supplier_id IS NOT NULL
  GROUP BY supplier_id
) sub
WHERE sub.supplier_id = s.id;

-- 3. trigger function：維護 usage_count
CREATE OR REPLACE FUNCTION public.update_supplier_usage_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.supplier_id IS NOT NULL THEN
      UPDATE public.suppliers SET usage_count = usage_count + 1 WHERE id = NEW.supplier_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.supplier_id IS NOT NULL THEN
      UPDATE public.suppliers SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = OLD.supplier_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.supplier_id IS DISTINCT FROM NEW.supplier_id THEN
      IF OLD.supplier_id IS NOT NULL THEN
        UPDATE public.suppliers SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = OLD.supplier_id;
      END IF;
      IF NEW.supplier_id IS NOT NULL THEN
        UPDATE public.suppliers SET usage_count = usage_count + 1 WHERE id = NEW.supplier_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. attach trigger
DROP TRIGGER IF EXISTS trg_pri_supplier_usage ON public.payment_request_items;
CREATE TRIGGER trg_pri_supplier_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_request_items
  FOR EACH ROW EXECUTE FUNCTION public.update_supplier_usage_count();

-- 5. 驗證
DO $$
DECLARE
  v_total_with_usage int;
BEGIN
  SELECT count(*) INTO v_total_with_usage FROM public.suppliers WHERE usage_count > 0;
  RAISE NOTICE '✓ usage_count column + trigger 完成、% 家供應商有使用紀錄', v_total_with_usage;
END $$;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_pri_supplier_usage ON public.payment_request_items;
-- DROP FUNCTION IF EXISTS public.update_supplier_usage_count();
-- ALTER TABLE public.suppliers DROP COLUMN IF EXISTS usage_count;
-- COMMIT;
