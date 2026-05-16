-- ============================================================================
-- Migration: ERP 端自動更新旅客快取
-- 日期: 2025-12-26
-- 目的: 當 ERP 資料變更時，自動更新相關旅客的快取
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. 自動更新快取的函數
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_refresh_traveler_cache()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id_number text;
  v_traveler_id uuid;
BEGIN
  -- 取得身分證號
  IF TG_TABLE_NAME = 'order_members' THEN
    v_id_number := COALESCE(NEW.id_number, OLD.id_number);
  END IF;

  -- 如果沒有身分證，跳過
  IF v_id_number IS NULL OR v_id_number = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 找到對應的旅客
  SELECT id INTO v_traveler_id
  FROM traveler_profiles
  WHERE id_number = v_id_number
  LIMIT 1;

  -- 如果找到旅客，刷新他的快取
  IF v_traveler_id IS NOT NULL THEN
    PERFORM refresh_traveler_tour_cache(v_traveler_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- 2. order_members 變更時觸發
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_order_member_cache ON order_members;

CREATE TRIGGER trigger_order_member_cache
AFTER INSERT OR UPDATE ON order_members
FOR EACH ROW
EXECUTE FUNCTION auto_refresh_traveler_cache();

-- ============================================================================
-- 3. 旅客綁定身分證時，自動建立快取
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_build_cache_on_id_bind()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- 當身分證從空變成有值時
  IF NEW.id_number IS NOT NULL
     AND (OLD.id_number IS NULL OR OLD.id_number = '')
     AND NEW.id_number != '' THEN
    -- 建立快取
    PERFORM refresh_traveler_tour_cache(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_build_cache_on_id_bind ON traveler_profiles;

CREATE TRIGGER trigger_build_cache_on_id_bind
AFTER UPDATE OF id_number ON traveler_profiles
FOR EACH ROW
EXECUTE FUNCTION auto_build_cache_on_id_bind();

-- ============================================================================
-- 4. tours 變更時，更新相關旅客的快取
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_refresh_cache_on_tour_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- 更新所有有這個團的旅客快取
  UPDATE traveler_tour_cache
  SET
    tour_name = NEW.name,
    departure_date = NEW.departure_date::date,
    return_date = NEW.return_date::date,
    tour_status = NEW.status,
    location = NEW.location,
    outbound_flight = NEW.outbound_flight,
    return_flight = NEW.return_flight,
    source_updated_at = NEW.updated_at,
    cached_at = now()
  WHERE tour_id = NEW.id::text;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_tour_update_cache ON tours;

CREATE TRIGGER trigger_tour_update_cache
AFTER UPDATE ON tours
FOR EACH ROW
WHEN (
  OLD.name IS DISTINCT FROM NEW.name OR
  OLD.departure_date IS DISTINCT FROM NEW.departure_date OR
  OLD.return_date IS DISTINCT FROM NEW.return_date OR
  OLD.status IS DISTINCT FROM NEW.status OR
  OLD.location IS DISTINCT FROM NEW.location OR
  OLD.outbound_flight IS DISTINCT FROM NEW.outbound_flight OR
  OLD.return_flight IS DISTINCT FROM NEW.return_flight
)
EXECUTE FUNCTION auto_refresh_cache_on_tour_update();

-- ============================================================================
-- 完成
-- ============================================================================

COMMIT;
