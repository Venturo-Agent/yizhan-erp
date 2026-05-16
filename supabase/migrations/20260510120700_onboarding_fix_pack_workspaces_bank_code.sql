-- ============================================================================
-- Migration: Onboarding fix pack #8 — workspaces / bank_accounts 加 bank_code FK
-- Date: 2026-05-10
-- 公司銀行從純 text 改 ref_banks Combobox、舊的 bank_name 保留當顯示文字
-- 三處 Combobox：
--   - 公司銀行 → workspaces.bank_code（本 migration）
--   - 銀行帳戶 → bank_accounts.bank_code（本 migration）
--   - 供應商銀行 → suppliers.bank_code（已在 20260510120400）
-- ============================================================================

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS bank_code VARCHAR(3) REFERENCES ref_banks(bank_code) ON DELETE SET NULL;

COMMENT ON COLUMN workspaces.bank_code IS '公司銀行代號（FK to ref_banks、配合 BankCombobox）';

CREATE INDEX IF NOT EXISTS idx_workspaces_bank_code ON workspaces(bank_code) WHERE bank_code IS NOT NULL;

-- bank_accounts 同步加 bank_code
-- 注意：venturo-aierp 某些環境（5/9 夜間 demo schema）尚未建 bank_accounts 表
-- 用 DO block 包住、表不在就靜默跳過、給 William 後續手動補表時再 apply
DO $$
BEGIN
  ALTER TABLE bank_accounts
    ADD COLUMN IF NOT EXISTS bank_code VARCHAR(3) REFERENCES ref_banks(bank_code) ON DELETE SET NULL;

  COMMENT ON COLUMN bank_accounts.bank_code IS '銀行代號（FK to ref_banks、Combobox 用、bank_name 同步保留為顯示文字）';

  CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_code ON bank_accounts(bank_code) WHERE bank_code IS NOT NULL;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'bank_accounts 表不存在、跳過（待 William 後續補表）';
END $$;
