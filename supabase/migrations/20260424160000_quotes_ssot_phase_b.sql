-- Migration: 報價單 SSOT Phase B
-- 日期：2026-04-24
-- 文件：docs/QUOTES_SSOT.md
--
-- 兩件事一起做：
--
-- 1. 新增 tours 保險欄位（業務：整團投保金額，發保險公司用）
--    - liability_insurance_coverage：旅遊責任險保額（萬）
--    - medical_insurance_coverage：意外醫療保額（萬）
--
-- 2. 拔掉 tours 4 個冗餘定價欄位（SSOT 破碎、跟 quotes 雙存）
--    - tier_pricings、selling_prices、participant_counts、accommodation_days
--    - 驗證：16 個有值的 tour、全部跟對應 standard quote 完全一致
--    - 沒有 trigger / function / view 引用
--    - 唯一讀取點 src/features/quotes/components/QuoteDetailEmbed.tsx（同 commit 已改）
--
-- 影響：
-- - tours row 完全不動（只拔欄位 + 加欄位）
-- - quotes 完全不動

BEGIN;

-- 1. 新增保險欄位
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS liability_insurance_coverage INTEGER,
  ADD COLUMN IF NOT EXISTS medical_insurance_coverage INTEGER;

COMMENT ON COLUMN public.tours.liability_insurance_coverage IS '旅遊責任險保額（單位：新台幣萬元）';
COMMENT ON COLUMN public.tours.medical_insurance_coverage IS '意外醫療保額（單位：新台幣萬元）';

-- 2. 拔掉冗餘定價欄位（SSOT 統一在 quotes 表）
ALTER TABLE public.tours DROP COLUMN IF EXISTS tier_pricings;
ALTER TABLE public.tours DROP COLUMN IF EXISTS selling_prices;
ALTER TABLE public.tours DROP COLUMN IF EXISTS participant_counts;
ALTER TABLE public.tours DROP COLUMN IF EXISTS accommodation_days;

COMMIT;
