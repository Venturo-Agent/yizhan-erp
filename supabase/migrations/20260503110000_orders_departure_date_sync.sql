-- ============================================================================
-- 20260503110000_orders_departure_date_sync.sql
--
-- T9 訂單頁讀取量優化：orders 加 departure_date 欄位、自動同步 tours.departure_date
-- William 2026-05-02 拍板：訂單列表排序用「出團日」、不再用 created_at
--
-- 為什麼加欄位而不是跨表 sort：
--   - PostgREST .range() + .order() 不支援 ORDER BY joined column
--   - 加 departure_date 欄位 + trigger 同步、orders 自己能 sort
--   - 業務上「訂單的出團日」= 「訂單對應 tour 的出團日」、語意一致
-- ============================================================================

-- 1. 加欄位
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS departure_date date;

-- 2. Backfill：從 tours.departure_date copy
UPDATE public.orders o
SET departure_date = t.departure_date
FROM public.tours t
WHERE o.tour_id = t.id::text
  AND o.departure_date IS NULL;

-- 3. Trigger function：INSERT/UPDATE order 時從 tour 同步
CREATE OR REPLACE FUNCTION public.sync_order_departure_date()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tour_id IS NOT NULL THEN
    SELECT t.departure_date INTO NEW.departure_date
    FROM public.tours t
    WHERE t.id::text = NEW.tour_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sync_order_departure_date ON public.orders;
CREATE TRIGGER sync_order_departure_date
  BEFORE INSERT OR UPDATE OF tour_id ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_departure_date();

-- 4. Trigger function：tour.departure_date 變動時連動所有相關 orders
CREATE OR REPLACE FUNCTION public.cascade_tour_departure_date_to_orders()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.departure_date IS DISTINCT FROM NEW.departure_date THEN
    UPDATE public.orders
    SET departure_date = NEW.departure_date
    WHERE tour_id = NEW.id::text;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS cascade_tour_departure_date ON public.tours;
CREATE TRIGGER cascade_tour_departure_date
  AFTER UPDATE OF departure_date ON public.tours
  FOR EACH ROW EXECUTE FUNCTION public.cascade_tour_departure_date_to_orders();

-- 5. Index for sort performance
CREATE INDEX IF NOT EXISTS idx_orders_departure_date
  ON public.orders (workspace_id, departure_date);
