-- ============================================================================
-- Migration: Onboarding fix pack #5 — suppliers.is_domestic + bank_code FK
-- Date: 2026-05-10
-- 變更：
--   - suppliers.is_domestic（國內/國外旗標、預設 true）
--   - 既有 bank_code_legacy（純 text）保留、新建 bank_code 欄位 → ref_banks.bank_code（可空）
--     轉換策略：UI 兩條路、未來逐步把 legacy 文字 mapping 進 bank_code
--   - swift_code（國外供應商跨國轉帳用）
-- ============================================================================

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS is_domestic BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bank_code VARCHAR(3) REFERENCES ref_banks(bank_code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS swift_code VARCHAR(11);

-- 既有 bank_code_legacy 為三碼數字時、嘗試 backfill 進 bank_code
-- 失敗（找不到對應 ref_banks）就保持 null、UI 會 fallback 走 legacy
-- 注意：bank_code_legacy 欄位在某些 schema dump 不存在（venturo-aierp schema drift）
-- 用 DO block + EXCEPTION 包住、欄位不在就靜默跳過
DO $$
BEGIN
  UPDATE suppliers
  SET bank_code = bank_code_legacy
  WHERE bank_code IS NULL
    AND bank_code_legacy IS NOT NULL
    AND bank_code_legacy IN (SELECT bank_code FROM ref_banks);
EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE 'suppliers.bank_code_legacy 欄位不存在、跳過 backfill';
END $$;

COMMENT ON COLUMN suppliers.is_domestic IS '是否為臺灣國內供應商（true=走 ref_banks Combobox + 自動手續費辨識；false=text 銀行 + SWIFT、不辨識手續費）';
COMMENT ON COLUMN suppliers.bank_code IS '銀行代號（FK to ref_banks.bank_code、僅 is_domestic=true 時應填）';
COMMENT ON COLUMN suppliers.swift_code IS 'SWIFT code（is_domestic=false 跨國轉帳必填）';

CREATE INDEX IF NOT EXISTS idx_suppliers_bank_code ON suppliers(bank_code) WHERE bank_code IS NOT NULL;
