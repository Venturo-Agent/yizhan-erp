-- ============================================================================
-- Migration: 旅客行程快取表
-- 日期: 2025-12-26
-- 目的: 避免每次查詢都 JOIN 多個表格，提升讀取效能
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. 快取表：存放會員的 ERP 行程資料（預先計算好的）
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traveler_tour_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 旅客
  traveler_id uuid NOT NULL REFERENCES traveler_profiles(id) ON DELETE CASCADE,
  id_number text NOT NULL,  -- 冗餘存放，加速查詢

  -- ERP 資料（快取）
  tour_id text NOT NULL,
  tour_code text NOT NULL,
  tour_name text,
  departure_date date,
  return_date date,
  tour_status text,
  location text,

  -- 訂單資料
  order_id text NOT NULL,
  order_code text,
  order_status text,

  -- 成員資料
  order_member_id text NOT NULL,
  chinese_name text,
  english_name text,
  member_type text,      -- adult/child/infant
  identity text,         -- 身份類型

  -- 航班資料（快取 JSON）
  outbound_flight jsonb,
  return_flight jsonb,

  -- 行程資料（快取）
  itinerary_id text,
  itinerary_title text,
  itinerary_updated_at timestamptz,

  -- 快取元資料
  cached_at timestamptz DEFAULT now(),
  source_updated_at timestamptz,  -- ERP 資料的最後更新時間

  -- 唯一約束：一個旅客在一個團只有一筆快取
  UNIQUE(traveler_id, tour_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_traveler_tour_cache_traveler
  ON traveler_tour_cache(traveler_id);
CREATE INDEX IF NOT EXISTS idx_traveler_tour_cache_id_number
  ON traveler_tour_cache(id_number);
CREATE INDEX IF NOT EXISTS idx_traveler_tour_cache_tour_code
  ON traveler_tour_cache(tour_code);
CREATE INDEX IF NOT EXISTS idx_traveler_tour_cache_departure
  ON traveler_tour_cache(departure_date DESC);

COMMENT ON TABLE traveler_tour_cache IS '旅客 ERP 行程快取（避免重複 JOIN）';

-- ============================================================================
-- 2. 刷新快取的函數
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_traveler_tour_cache(p_traveler_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_id_number text;
BEGIN
  -- 如果指定了旅客，只刷新該旅客的快取
  IF p_traveler_id IS NOT NULL THEN
    SELECT id_number INTO v_id_number
    FROM traveler_profiles
    WHERE id = p_traveler_id;

    IF v_id_number IS NULL THEN
      RETURN 0;
    END IF;

    -- 刪除舊快取
    DELETE FROM traveler_tour_cache WHERE traveler_id = p_traveler_id;

    -- 插入新快取
    INSERT INTO traveler_tour_cache (
      traveler_id, id_number,
      tour_id, tour_code, tour_name, departure_date, return_date, tour_status, location,
      order_id, order_code, order_status,
      order_member_id, chinese_name, english_name, member_type, identity,
      outbound_flight, return_flight,
      itinerary_id, itinerary_title, itinerary_updated_at,
      source_updated_at
    )
    SELECT
      p_traveler_id,
      v_id_number,
      t.id,
      t.code,
      t.name,
      t.departure_date::date,
      t.return_date::date,
      t.status,
      t.location,
      o.id,
      o.code,
      o.status,
      om.id,
      om.chinese_name,
      om.passport_name,
      om.member_type,
      om.identity,
      t.outbound_flight,
      t.return_flight,
      i.id,
      i.title,
      i.updated_at,
      GREATEST(t.updated_at, o.updated_at, om.updated_at, i.updated_at)
    FROM order_members om
    JOIN orders o ON o.id::text = om.order_id::text
    JOIN tours t ON t.id::text = o.tour_id::text
    LEFT JOIN itineraries i ON i.tour_code = t.code AND i.status = 'final'
    WHERE om.id_number = v_id_number
      AND (t.status IS NULL OR t.status NOT IN ('cancelled'))
      AND (o.status IS NULL OR o.status NOT IN ('cancelled'));

    GET DIAGNOSTICS v_count = ROW_COUNT;

  ELSE
    -- 刷新所有有身分證的旅客
    -- 先清空
    TRUNCATE traveler_tour_cache;

    -- 重新填入
    INSERT INTO traveler_tour_cache (
      traveler_id, id_number,
      tour_id, tour_code, tour_name, departure_date, return_date, tour_status, location,
      order_id, order_code, order_status,
      order_member_id, chinese_name, english_name, member_type, identity,
      outbound_flight, return_flight,
      itinerary_id, itinerary_title, itinerary_updated_at,
      source_updated_at
    )
    SELECT
      tp.id,
      tp.id_number,
      t.id,
      t.code,
      t.name,
      t.departure_date::date,
      t.return_date::date,
      t.status,
      t.location,
      o.id,
      o.code,
      o.status,
      om.id,
      om.chinese_name,
      om.passport_name,
      om.member_type,
      om.identity,
      t.outbound_flight,
      t.return_flight,
      i.id,
      i.title,
      i.updated_at,
      GREATEST(t.updated_at, o.updated_at, om.updated_at, i.updated_at)
    FROM traveler_profiles tp
    JOIN order_members om ON om.id_number = tp.id_number
    JOIN orders o ON o.id::text = om.order_id::text
    JOIN tours t ON t.id::text = o.tour_id::text
    LEFT JOIN itineraries i ON i.tour_code = t.code AND i.status = 'final'
    WHERE tp.id_number IS NOT NULL
      AND (t.status IS NULL OR t.status NOT IN ('cancelled'))
      AND (o.status IS NULL OR o.status NOT IN ('cancelled'));

    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_traveler_tour_cache TO authenticated;

-- ============================================================================
-- 3. 會員自己刷新快取的函數（登入時呼叫）
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_my_tours()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_id_number text;
BEGIN
  -- 取得當前用戶的身分證
  SELECT id_number INTO v_id_number
  FROM traveler_profiles
  WHERE id = auth.uid();

  IF v_id_number IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '請先綁定身分證',
      'synced_count', 0
    );
  END IF;

  -- 刷新快取
  SELECT refresh_traveler_tour_cache(auth.uid()) INTO v_count;

  -- 更新同步時間
  UPDATE traveler_profiles
  SET last_synced_at = now(),
      sync_version = sync_version + 1
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'message', '同步完成',
    'synced_count', v_count,
    'synced_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_my_tours TO authenticated;

COMMENT ON FUNCTION public.sync_my_tours IS '會員同步自己的 ERP 行程到快取（登入/手動刷新時呼叫）';

-- ============================================================================
-- 4. 簡化的查詢 View（從快取讀取，超快！）
-- ============================================================================
CREATE OR REPLACE VIEW public.my_tours AS
SELECT
  id,
  tour_code,
  tour_name AS title,
  departure_date AS start_date,
  return_date AS end_date,
  tour_status AS status,
  location AS destination,
  order_code,
  order_status,
  chinese_name,
  english_name,
  member_type,
  identity,
  outbound_flight,
  return_flight,
  itinerary_title,
  cached_at,
  source_updated_at
FROM traveler_tour_cache
WHERE traveler_id = auth.uid();

COMMENT ON VIEW my_tours IS '我的行程（從快取讀取，效能好）';

-- ============================================================================
-- 5. 當 ERP 資料變更時，標記快取需要更新（可選）
-- ============================================================================
-- 這個 trigger 會在 tours 更新時，標記相關旅客的快取過期
-- 旅客下次登入時會自動刷新

ALTER TABLE traveler_tour_cache
ADD COLUMN IF NOT EXISTS needs_refresh boolean DEFAULT false;

-- 也可以改用 background job 定期刷新，而不是即時 trigger
-- 因為 trigger 可能影響 ERP 的寫入效能

-- ============================================================================
-- 完成
-- ============================================================================

COMMIT;
