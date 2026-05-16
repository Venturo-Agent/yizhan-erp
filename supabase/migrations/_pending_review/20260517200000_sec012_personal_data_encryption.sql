-- ════════════════════════════════════════════════════════════════════
-- SEC-012 Phase 1：個人敏感欄位加密 — 加 encrypted_* 欄位
--
-- 為什麼：
--   employees.bank_account_number（銀行帳號）和 employees.id_number（身分證字號）
--   是《個人資料保護法》第六條「特種個人資料」。DB 現在以明文儲存、
--   若 SQL injection / 內部人員 export、直接洩漏。
--   Application-layer AES-256-GCM 加密後、DB 存密文、master key 在 env（PERSONAL_DATA_ENCRYPTION_KEY）。
--
-- 2-phase 遷移策略（不中斷服務、不刪現有資料）：
--
--   Phase 1（本 migration）：
--     - 加 encrypted_bank_account_number TEXT（nullable）
--     - 加 encrypted_id_number TEXT（nullable）
--     - 原明文欄 bank_account_number / id_number 留著（不刪）
--     - App deploy 後、新寫入走 encrypted_* 欄、同時填原欄（過渡期讀寫都 OK）
--
--   Phase 2（確認 backfill 完成後、William review 才 apply）：
--     - backfill：把舊明文欄值用 app-layer 批次加密、填到 encrypted_* 欄
--     - 驗證：檢查 encrypted_* 欄 NULL 數量 = 0（確認 backfill 完）
--     - DROP 明文欄 bank_account_number / id_number
--     - 這份 Phase 2 migration 另外開 _pending_review/YYYYMMDD_sec012_phase2_drop_plaintext.sql
--
-- 注意：
--   - 本 migration 純加欄、idempotent（IF NOT EXISTS）
--   - 不修改既有 RLS（Phase 1 不影響查詢路徑）
--   - 本 migration apply 後、要 NOTIFY pgrst reload schema（PostgREST 才認新欄）
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- Phase 1：加加密欄位
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS encrypted_bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_id_number TEXT;

COMMENT ON COLUMN public.employees.encrypted_bank_account_number IS
  'AES-256-GCM 加密的銀行帳號。格式：base64(iv[12]+authTag[16]+ciphertext)。'
  '明文在 src/lib/crypto/personal-data.ts 加解密。key = env PERSONAL_DATA_ENCRYPTION_KEY。'
  '過渡期間舊明文存在 bank_account_number（SEC-012 Phase 1）、Phase 2 完成後砍明文欄。';

COMMENT ON COLUMN public.employees.encrypted_id_number IS
  'AES-256-GCM 加密的身分證字號。格式：base64(iv[12]+authTag[16]+ciphertext)。'
  '明文在 src/lib/crypto/personal-data.ts 加解密。key = env PERSONAL_DATA_ENCRYPTION_KEY。'
  '過渡期間舊明文存在 id_number（SEC-012 Phase 1）、Phase 2 完成後砍明文欄。';

COMMIT;

-- 必跑 reload schema（PostgREST 才認到新欄）
NOTIFY pgrst, 'reload schema';

-- ════ Phase 2 Checklist（apply 前確認）════
--
-- 1. App 已部署含 personal-data.ts 的版本
-- 2. 驗證：新寫入員工 encrypted_bank_account_number / encrypted_id_number 不為 NULL
-- 3. Backfill script 跑完（用 service_role 批次讀明文、encryptPersonalField、寫密文）
-- 4. 驗證：SELECT COUNT(*) FROM employees WHERE bank_account_number IS NOT NULL AND encrypted_bank_account_number IS NULL = 0
-- 5. 確認上面 count = 0 後、William 拍板、才 apply Phase 2 migration（DROP 明文欄）
--
-- Phase 2 migration 大綱（另存 _pending_review/ 等 William review）：
-- BEGIN;
-- ALTER TABLE public.employees
--   DROP COLUMN IF EXISTS bank_account_number,
--   DROP COLUMN IF EXISTS id_number;
-- COMMIT;
-- NOTIFY pgrst, 'reload schema';

-- ════ Rollback（萬一 Phase 1 出問題、複製貼上跑）════
-- BEGIN;
-- ALTER TABLE public.employees
--   DROP COLUMN IF EXISTS encrypted_bank_account_number,
--   DROP COLUMN IF EXISTS encrypted_id_number;
-- COMMIT;
-- NOTIFY pgrst, 'reload schema';
