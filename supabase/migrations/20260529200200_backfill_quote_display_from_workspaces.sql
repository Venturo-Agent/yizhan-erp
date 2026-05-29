-- 為什麼：報價單收款資訊原本讀 workspaces.bank_*；SSOT 遷到 bank_accounts 後，
--   若無帳戶被勾 is_quote_display，報價單會掉銀行資訊。
--   策略：每個 workspace 挑一筆代表帳戶（is_default 優先、否則最早建立的 active 帳戶），
--         設 is_quote_display=true，並把 workspaces 既有的分行/戶名/銀行/帳號補進該帳戶「空欄」
--         （COALESCE + NULLIF：只填空白、不覆蓋帳戶已有的真實資料）。
--   branch_id 一律維持 NULL（全公司共用），多分公司（御風/角落）上線後人工指派。
-- 設計來源：workspace/架構整理/2026-05-29-報價單收款帳戶遷移-spec.md §3.3
-- 註：此為資料 backfill（非結構），idempotent —— 重跑只會再次 COALESCE，結果一致。

BEGIN;

WITH pick AS (
  SELECT DISTINCT ON (ba.workspace_id) ba.id, ba.workspace_id
  FROM public.bank_accounts ba
  WHERE ba.is_active
  ORDER BY ba.workspace_id, ba.is_default DESC NULLS LAST, ba.created_at ASC
)
UPDATE public.bank_accounts ba
SET is_quote_display     = true,
    bank_branch          = COALESCE(NULLIF(ba.bank_branch, ''), NULLIF(w.bank_branch, '')),
    account_holder_name  = COALESCE(NULLIF(ba.account_holder_name, ''), NULLIF(w.bank_account_name, '')),
    bank_name            = COALESCE(NULLIF(ba.bank_name, ''), NULLIF(w.bank_name, '')),
    account_number       = COALESCE(NULLIF(ba.account_number, ''), NULLIF(w.bank_account, ''))
FROM pick p
JOIN public.workspaces w ON w.id = p.workspace_id
WHERE ba.id = p.id;

COMMIT;

-- rollback（如需）：把被本次 backfill 設為顯示的帳戶取消顯示——無法精準還原被補的空欄，
-- 僅能手動處理；此 migration 設計為 idempotent、一般不需 rollback。
-- UPDATE public.bank_accounts SET is_quote_display = false WHERE is_quote_display = true;
