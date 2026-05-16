-- 為 tours 表添加航班資訊欄位
BEGIN;

-- 去程航班（JSON 格式，包含航空公司、班次、時間等）
ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS outbound_flight jsonb DEFAULT NULL;

-- 回程航班
ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS return_flight jsonb DEFAULT NULL;

COMMENT ON COLUMN public.tours.outbound_flight IS '去程航班資訊 (JSON: airline, flightNumber, departureAirport, departureTime, arrivalAirport, arrivalTime)';
COMMENT ON COLUMN public.tours.return_flight IS '回程航班資訊 (JSON: airline, flightNumber, departureAirport, departureTime, arrivalAirport, arrivalTime)';

COMMIT;
