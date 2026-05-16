-- ============================================================================
-- Migration: 旅客讀取 ERP 資料的權限設計
-- 日期: 2025-12-26
-- 目的: 讓會員可以讀取自己的 ERP 團資料，不需要複製資料
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. traveler_profiles 新增同步追蹤欄位
-- ============================================================================
ALTER TABLE traveler_profiles
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
ADD COLUMN IF NOT EXISTS sync_version integer DEFAULT 0;

COMMENT ON COLUMN traveler_profiles.last_synced_at IS '最後同步 ERP 資料的時間';
COMMENT ON COLUMN traveler_profiles.sync_version IS '同步版本號，用於增量更新';

-- ============================================================================
-- 2. 建立「我的 ERP 行程」View（給會員使用）
-- 注意：ERP 表格的 ID 都是 text 類型
-- ============================================================================
CREATE OR REPLACE VIEW public.my_erp_tours AS
SELECT
  t.id,
  t.code AS tour_code,
  t.name AS title,
  t.departure_date AS start_date,
  t.return_date AS end_date,
  t.status,
  t.location AS destination,
  t.updated_at,

  -- 從 order_members 取得此用戶的訂單資訊
  om.id AS order_member_id,
  om.order_id,
  om.chinese_name,
  om.passport_name AS english_name,
  om.identity AS member_type,  -- 成人/小孩/嬰兒
  om.member_type AS member_category,  -- adult/child/infant

  -- 訂單資訊
  o.code AS order_code,
  o.status AS order_status

FROM tours t
JOIN orders o ON o.tour_id::text = t.id::text
JOIN order_members om ON om.order_id::text = o.id::text
JOIN traveler_profiles tp ON tp.id_number = om.id_number
WHERE tp.id = auth.uid()
  AND (t.status IS NULL OR t.status NOT IN ('cancelled', 'archived'))
  AND (o.status IS NULL OR o.status NOT IN ('cancelled'));

COMMENT ON VIEW my_erp_tours IS '會員可查看的 ERP 行程（根據身分證自動匹配）';

-- ============================================================================
-- 3. 建立「我的行程詳情」函數（含航班、住宿）
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_tour_details(p_tour_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_id_number text;
BEGIN
  -- 取得當前用戶的身分證
  SELECT id_number INTO v_id_number
  FROM traveler_profiles
  WHERE id = auth.uid();

  IF v_id_number IS NULL THEN
    RETURN jsonb_build_object('error', '請先綁定身分證');
  END IF;

  -- 驗證用戶有權限看這個團
  IF NOT EXISTS (
    SELECT 1 FROM order_members om
    JOIN orders o ON o.id::text = om.order_id::text
    JOIN tours t ON t.id::text = o.tour_id::text
    WHERE t.code = p_tour_code
      AND om.id_number = v_id_number
  ) THEN
    RETURN jsonb_build_object('error', '無權限查看此行程');
  END IF;

  -- 取得行程詳情
  SELECT jsonb_build_object(
    'tour', jsonb_build_object(
      'code', t.code,
      'name', t.name,
      'departure_date', t.departure_date,
      'return_date', t.return_date,
      'status', t.status,
      'destination', t.location,
      'outbound_flight', t.outbound_flight,
      'return_flight', t.return_flight
    ),
    'itinerary', (
      SELECT jsonb_build_object(
        'id', i.id,
        'title', i.title,
        'outbound_flight', i.outbound_flight,
        'return_flight', i.return_flight,
        'hotels', i.hotels,
        'days', i.days,
        'updated_at', i.updated_at
      )
      FROM itineraries i
      WHERE i.tour_code = t.code
        AND i.status = 'final'
      ORDER BY i.updated_at DESC
      LIMIT 1
    ),
    'my_info', (
      SELECT jsonb_build_object(
        'chinese_name', om.chinese_name,
        'english_name', om.passport_name,
        'identity', om.identity,
        'member_type', om.member_type,
        'order_code', o.code
      )
      FROM order_members om
      JOIN orders o ON o.id::text = om.order_id::text
      WHERE o.tour_id::text = t.id::text
        AND om.id_number = v_id_number
      LIMIT 1
    ),
    'updated_at', t.updated_at
  ) INTO v_result
  FROM tours t
  WHERE t.code = p_tour_code;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_tour_details TO authenticated;

COMMENT ON FUNCTION public.get_my_tour_details IS '取得會員的行程詳情（含航班、住宿）';

-- ============================================================================
-- 4. 建立「檢查更新」函數（快取用）
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_my_tours_updates(p_last_synced_at timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_id_number text;
BEGIN
  -- 取得當前用戶的身分證
  SELECT id_number INTO v_id_number
  FROM traveler_profiles
  WHERE id = auth.uid();

  IF v_id_number IS NULL THEN
    RETURN jsonb_build_object(
      'has_updates', false,
      'message', '請先綁定身分證'
    );
  END IF;

  -- 檢查是否有更新的資料
  SELECT jsonb_build_object(
    'has_updates', EXISTS (
      SELECT 1 FROM tours t
      JOIN orders o ON o.tour_id::text = t.id::text
      JOIN order_members om ON om.order_id::text = o.id::text
      WHERE om.id_number = v_id_number
        AND (p_last_synced_at IS NULL OR t.updated_at > p_last_synced_at)
    ),
    'updated_tours', (
      SELECT jsonb_agg(jsonb_build_object(
        'tour_code', t.code,
        'name', t.name,
        'updated_at', t.updated_at
      ))
      FROM tours t
      JOIN orders o ON o.tour_id::text = t.id::text
      JOIN order_members om ON om.order_id::text = o.id::text
      WHERE om.id_number = v_id_number
        AND (p_last_synced_at IS NULL OR t.updated_at > p_last_synced_at)
    ),
    'server_time', now()
  ) INTO v_result;

  -- 更新用戶的同步時間
  UPDATE traveler_profiles
  SET last_synced_at = now(),
      sync_version = sync_version + 1
  WHERE id = auth.uid();

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_my_tours_updates TO authenticated;

COMMENT ON FUNCTION public.check_my_tours_updates IS '檢查 ERP 行程是否有更新（快取機制）';

-- ============================================================================
-- 5. traveler_trips 調整：明確標記用途
-- ============================================================================
-- 新增欄位區分「自建行程」vs「ERP 行程包裝」
ALTER TABLE traveler_trips
ADD COLUMN IF NOT EXISTS trip_source text DEFAULT 'self_created'
  CHECK (trip_source IN ('self_created', 'erp_linked'));

COMMENT ON COLUMN traveler_trips.trip_source IS 'self_created=自建行程, erp_linked=連結ERP的包裝';

-- 如果是 erp_linked，erp_tour_id 和 tour_code 必須有值
-- 這只是邏輯約束，不強制（讓應用層處理）

-- ============================================================================
-- 6. 標記可以刪除的表格（自由行專用，ERP 會員不需要）
-- ============================================================================
-- 以下表格保留給「自建行程」使用：
-- - traveler_trip_flights
-- - traveler_trip_accommodations
-- - traveler_trip_invitations
--
-- ERP 會員不使用這些表格，而是透過：
-- - my_erp_tours View
-- - get_my_tour_details() 函數
-- 直接讀取 ERP 資料

COMMENT ON TABLE traveler_trip_flights IS '自建行程的航班資料（ERP 會員請用 get_my_tour_details）';
COMMENT ON TABLE traveler_trip_accommodations IS '自建行程的住宿資料（ERP 會員請用 get_my_tour_details）';

-- ============================================================================
-- 完成
-- ============================================================================

COMMIT;
