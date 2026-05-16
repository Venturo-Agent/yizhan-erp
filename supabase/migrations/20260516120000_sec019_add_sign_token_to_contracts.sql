-- Migration: 為 contracts 表加 sign_token 欄位
--
-- 為什麼：
-- SEC-019 要求 /api/contracts/sign 有獨立的簽名 Token 驗證。
-- 目前 sign API 只靠 contractId UUID（122-bit entropy）當防護，
-- 但沒有一個獨立 secret 能讓簽名 link 被 backend 撤銷、或確認請求真的來自
-- 打開過那個合約頁面的人（而不是只靠 UUID 不可猜測當唯一屏障）。
--
-- 方案：每張合約建立時產生一個 32 字元 random hex token（128 bits entropy）。
-- 客戶打開公開簽名頁時，server 把 sign_token 傳給前端，
-- 前端提交簽名時帶上 sign_token，API 驗證 token + contractId 雙重匹配。
--
-- 威脅模型改善：
-- 舊：知道 contractId UUID → 可呼叫 API（rate limit 唯一屏障）
-- 新：知道 contractId + sign_token 才能呼叫（兩個獨立 secret，後者可撤銷/重產）
--
-- 這個 migration 是純加欄位（非破壞性），不需要 rollback SQL。
-- 現有合約（sign_token IS NULL）會被 API 拒絕，但公開頁面重新打開就能正常用。

BEGIN;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS sign_token TEXT;

-- 為現有合約補產 sign_token（用 gen_random_bytes 產 32 bytes hex）
-- 現有合約都是 draft/pending 狀態（production 尚無客戶資料），補完不影響業務
UPDATE public.contracts
SET sign_token = encode(gen_random_bytes(32), 'hex')
WHERE sign_token IS NULL;

-- 加上唯一索引：確保 token 不重複
CREATE UNIQUE INDEX IF NOT EXISTS contracts_sign_token_unique
  ON public.contracts (sign_token)
  WHERE sign_token IS NOT NULL;

-- 加上查詢索引：API 驗證時 by contractId + sign_token 快速查
CREATE INDEX IF NOT EXISTS contracts_id_sign_token_idx
  ON public.contracts (id, sign_token);

COMMIT;

-- ════ Rollback（萬一需要回退、複製貼上跑）════
-- BEGIN;
-- DROP INDEX IF EXISTS contracts_id_sign_token_idx;
-- DROP INDEX IF EXISTS contracts_sign_token_unique;
-- ALTER TABLE public.contracts DROP COLUMN IF EXISTS sign_token;
-- COMMIT;
