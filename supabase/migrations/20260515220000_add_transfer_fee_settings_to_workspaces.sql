-- ════════════════════════════════════════════════════════════════════════════
-- 出納單匯款手續費結帳設定
-- spec: Logan-Workspace/2026-05-15-出納單完整重構-spec.md (Phase 2)
--
-- 為什麼：
--   出納單 wizard 過去讓 user 每次手動選分攤模式（equal / proportional）、
--   應該由公司結帳設定統一控制。同時加上「統一收付」模式（每筆固定 + 差額入賬）。
--
-- 三個欄位：
--   - transfer_fee_mode      'average' | 'unified'（預設 average）
--   - transfer_fee_unified_amount  unified mode 每筆收的金額
--   - transfer_fee_overflow_account_id  unified mode 差額入哪個 bank_account
--
-- 注意：不 FORCE RLS workspaces（紅線 A）、加欄位純擴展、無 RLS policy 影響。
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS transfer_fee_mode text
    CHECK (transfer_fee_mode IN ('average', 'unified')) DEFAULT 'average',
  ADD COLUMN IF NOT EXISTS transfer_fee_unified_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS transfer_fee_overflow_account_id uuid
    REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workspaces.transfer_fee_mode IS
  'average=平均分配（公司不賺不虧、實際手續費平均分攤、餘額最後一筆吃）；unified=統一收付（公司收固定金額、差額入收款）';
COMMENT ON COLUMN public.workspaces.transfer_fee_unified_amount IS
  'unified mode：每筆請款單固定收的手續費金額（譬如每筆 30 元）';
COMMENT ON COLUMN public.workspaces.transfer_fee_overflow_account_id IS
  'unified mode：差額（公司收 - 銀行實扣）入賬到哪個 bank_account（公司收入）';

-- 通知 PostgREST reload schema、確保 client 馬上看得到新欄位
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ════════ Rollback（萬一爆炸、複製貼上跑）════════
-- BEGIN;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS transfer_fee_overflow_account_id;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS transfer_fee_unified_amount;
-- ALTER TABLE public.workspaces DROP COLUMN IF EXISTS transfer_fee_mode;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
