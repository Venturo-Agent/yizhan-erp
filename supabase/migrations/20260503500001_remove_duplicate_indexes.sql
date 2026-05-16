-- 砍 5 組重複 index（同表同欄位、命名不一致留下兩條）
-- Round 2 自主迭代：DROP INDEX 不動 data、純效能操作
-- 來源：advisor duplicate_index WARN
-- 保留命名較完整 / 跟新 convention 一致的、砍另一條

DROP INDEX IF EXISTS public.idx_employees_number;            -- 保留 idx_employees_employee_number
DROP INDEX IF EXISTS public.idx_itineraries_tour_id;         -- 保留 itineraries_tour_id_idx
DROP INDEX IF EXISTS public.idx_itineraries_created_by;      -- 保留 itineraries_created_by_idx
DROP INDEX IF EXISTS public.idx_receipts_order;              -- 保留 idx_receipts_order_id
DROP INDEX IF EXISTS public.idx_suppliers_active;            -- 保留 idx_suppliers_is_active
