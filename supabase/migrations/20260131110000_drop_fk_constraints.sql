-- 移除 online_trips 的 FK 約束
-- FK 約束會阻止 ERP 寫入資料（因為 erp_tour_id 不需要關聯驗證）

ALTER TABLE online_trips DROP CONSTRAINT IF EXISTS online_trips_erp_tour_id_fkey;
ALTER TABLE online_trips DROP CONSTRAINT IF EXISTS online_trips_erp_itinerary_id_fkey;
