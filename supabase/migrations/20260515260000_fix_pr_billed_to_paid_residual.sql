-- ════════════════════════════════════════════════════════════════════
-- Fix payment_requests.status 'billed' 殘留（11 筆）→ 'paid'
--
-- 為什麼：
--   2026-05-15 William 拍板「請款單只有 3 狀態：pending=未付款 / confirmed=待付款 / paid=已付款」
--   前一個 session（Max）已把 IMP- 開頭的舊 billed 改 paid、但漏了 11 筆非 IMP-
--   今天 William 在 /tours/TW260321A 看到 Liz 高爾夫球團 PR I02/I04 顯示英文「billed」
--   定位為這 11 筆 + STATUS_LABEL_MAP 沒寫 billed → fallback raw 英文漏出
--
-- 修法：
--   業務邏輯上 billed = 「已綁出納單、已被付掉」、跟 paid 同義
--   全部 UPDATE 為 paid、之後階段 4 加 CHECK constraint 鎖死只允許 pending/confirmed/paid
--
-- 影響：
--   11 筆 row（跨 8 個團）、不影響 _items 子表（沒有 status 欄）
--   不影響 disbursement_orders（disbursement 不跟 PR.status 連動）
--
-- 完整盤點報告：Logan-Workspace/2026-05-15-狀態-SSOT-盤點.md
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- 修前先記錄受影響的列數、便於對帳
DO $$
DECLARE
  affected_count INT;
BEGIN
  SELECT COUNT(*) INTO affected_count FROM public.payment_requests WHERE status = 'billed';
  RAISE NOTICE 'About to update % rows with status = billed', affected_count;
END $$;

UPDATE public.payment_requests
SET
  status = 'paid',
  updated_at = NOW()
WHERE status = 'billed';

-- 驗證沒有 billed 殘留
DO $$
DECLARE
  remaining INT;
BEGIN
  SELECT COUNT(*) INTO remaining FROM public.payment_requests WHERE status = 'billed';
  IF remaining > 0 THEN
    RAISE EXCEPTION 'Still have % billed rows after update', remaining;
  END IF;
  RAISE NOTICE 'All billed rows successfully migrated to paid';
END $$;

COMMIT;

-- ════════ Rollback（萬一爆炸、複製貼上跑）════════
-- BEGIN;
-- -- 注意：無法 100% rollback 因為我們只有「11 筆」這個總數、不知道哪 11 筆
-- -- 若需 rollback、要從 audit log / 備份找到 5/15 23:00 前 status='billed' 的 11 個 id
-- -- 並針對該 id 列表執行：UPDATE payment_requests SET status='billed' WHERE id IN (...)
-- -- 這個 rollback 不建議自動執行、需要人工確認
-- COMMIT;
