-- ============================================================================
-- Migration: 員工 Amadeus TOTP 驗證種子欄位
-- Date: 2026-04-22
-- Reason: 首頁新增 Amadeus 驗證碼小工具。讓員工把 Google Authenticator 的
--         Amadeus 驗證種子存到 ERP、直接在首頁拿 30 秒 TOTP 驗證碼，
--         不用再開手機。種子以 AES-256-GCM 加密後存入（app 層加密、
--         key 由 env 管理），此欄位不應被前端直接 SELECT。
-- Impact: 非破壞性 — 加兩個 nullable 欄位，不動既有資料、不動 RLS。
-- 存取規則：所有存取一律透過 /api/amadeus-totp/* API route、
--           admin client + 驗證 auth.uid 對應 employees.supabase_user_id。
-- ============================================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS amadeus_totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS amadeus_totp_account_name TEXT;

COMMENT ON COLUMN employees.amadeus_totp_secret IS
  'AES-256-GCM 加密後的 Amadeus TOTP base32 種子（base64 編碼：iv+tag+ciphertext）。'
  '只由 /api/amadeus-totp/* API route 存取，key 取自 AMADEUS_TOTP_ENCRYPTION_KEY env。';
COMMENT ON COLUMN employees.amadeus_totp_account_name IS
  'Amadeus TOTP 的帳號名稱（從 QR code 解出、用於 widget 顯示，例：william@amadeus）。';
