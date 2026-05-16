-- Migration: 保險金額預設值（法規最低 250/10）
-- 日期：2026-04-24
-- 文件：docs/QUOTES_SSOT.md
--
-- 業務規則：
-- - 旅遊責任險 250 萬、意外醫療 10 萬是法規最低
-- - 提案可調高、但絕不會低於這個基線
--
-- 動作：
-- 1. 設 DB DEFAULT，新團 INSERT 不指定欄位時自動帶 250/10
-- 2. 補現有 35 筆 NULL 為 250/10（未填過值，補基線安全）

BEGIN;

ALTER TABLE public.tours
  ALTER COLUMN liability_insurance_coverage SET DEFAULT 250,
  ALTER COLUMN medical_insurance_coverage SET DEFAULT 10;

COMMENT ON COLUMN public.tours.liability_insurance_coverage
  IS '旅遊責任險保額（單位：新台幣萬元）。法規最低 250 萬、提案可調高';
COMMENT ON COLUMN public.tours.medical_insurance_coverage
  IS '意外醫療保額（單位：新台幣萬元）。法規最低 10 萬、提案可調高';

UPDATE public.tours
  SET liability_insurance_coverage = 250
  WHERE liability_insurance_coverage IS NULL;

UPDATE public.tours
  SET medical_insurance_coverage = 10
  WHERE medical_insurance_coverage IS NULL;

COMMIT;
