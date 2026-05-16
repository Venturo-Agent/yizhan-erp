-- 2026-04-22: 清第二輪掃出的 6 張殘留孤兒表（全 0 row 0 src 引用）
-- usa_esta: 簽證管理用 visas 表、這張是空的另一概念、砍
-- tour_table_assignments: 餐廳分桌（不是分房、分房用 tour_rooms）、未做完、砍
-- tour_refunds: 退款併入收款、不獨立成表
-- 其他 3 張: price_list_items / tour_control_forms / tour_custom_cost_values、全空全孤兒
BEGIN;
DROP TABLE IF EXISTS public.usa_esta CASCADE;
DROP TABLE IF EXISTS public.tour_table_assignments CASCADE;
DROP TABLE IF EXISTS public.tour_refunds CASCADE;
DROP TABLE IF EXISTS public.price_list_items CASCADE;
DROP TABLE IF EXISTS public.tour_control_forms CASCADE;
DROP TABLE IF EXISTS public.tour_custom_cost_values CASCADE;
COMMIT;
