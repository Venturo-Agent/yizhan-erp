-- 2026-04-23: 砍 supplier_employees（遊覽車司機殘留、fleet 系統砍時漏掉的孤兒）
-- 1 row（田中太郎、role=driver、vehicle_type=bus）= 之前砍 fleet 5 表時遺漏
-- 0 src 引用、suppliers 主表已有 contact_person/phone/email、不需子表
BEGIN;
DROP TABLE IF EXISTS public.supplier_employees CASCADE;
COMMIT;
