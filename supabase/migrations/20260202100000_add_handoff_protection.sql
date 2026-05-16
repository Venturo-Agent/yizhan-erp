-- 交接後行程鎖定保護
-- 當 tour_confirmation_sheets.status = 'completed' 時，禁止修改相關行程

-- 建立檢查函數
CREATE OR REPLACE FUNCTION check_itinerary_handoff_status()
RETURNS TRIGGER AS $$
DECLARE
  is_handed_off BOOLEAN;
BEGIN
  -- 檢查此行程是否已交接
  SELECT EXISTS (
    SELECT 1 
    FROM tour_confirmation_sheets tcs
    JOIN tours t ON t.id = tcs.tour_id
    WHERE t.locked_itinerary_id = NEW.id
    AND tcs.status = 'completed'
  ) INTO is_handed_off;
  
  IF is_handed_off THEN
    RAISE EXCEPTION '此行程已交接，無法修改。如需修改，請先解除鎖定。';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立 trigger（如果不存在）
DROP TRIGGER IF EXISTS itinerary_handoff_check ON itineraries;
CREATE TRIGGER itinerary_handoff_check
  BEFORE UPDATE ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION check_itinerary_handoff_status();

-- 註解
COMMENT ON FUNCTION check_itinerary_handoff_status() IS '檢查行程是否已交接，已交接的行程禁止修改';
COMMENT ON TRIGGER itinerary_handoff_check ON itineraries IS '交接後行程鎖定保護';
