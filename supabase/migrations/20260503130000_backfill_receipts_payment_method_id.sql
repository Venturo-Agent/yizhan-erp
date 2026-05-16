-- ============================================================================
-- 20260503130000_backfill_receipts_payment_method_id.sql
--
-- 背景：receipts 表三個欄位做同件事（payment_method 字串 / receipt_type 數字 /
-- payment_method_id FK）、新 SSOT 改用 payment_method_id 為唯一真相。
-- 既有資料 payment_method_id 大部分為 NULL、用 receipt_type 字串 / 數字 backfill。
--
-- 邏輯：
--   1. 若 receipt_type 是 method.name 字串（譬如「匯款-國泰」「信用卡」）→ 直接 join 找
--   2. 若 receipt_type 是數字（0-4）→ 對應到 code（TRANSFER/CASH/CREDIT_CARD/CHECK/LINKPAY）
--      再找該 workspace 的 system method
--   3. 同 workspace 找不到對應 method → 留 NULL（admin 自己手動修）
-- ============================================================================

-- 確保 receipt_type 欄位是 TEXT（不是 INTEGER）— 之前 PaymentItemRow 寫 string、
-- DB schema 應該已經容得下、但保險起見用 cast。
-- 若 column type 是 integer、cast 會 fail；若是 text、cast 沒影響。

-- Step 1: 用 method.name 字串對齊（receipt_type 是字串型別 / 內容是 method.name）
UPDATE public.receipts r
SET payment_method_id = pm.id
FROM public.payment_methods pm
WHERE r.payment_method_id IS NULL
  AND pm.workspace_id = r.workspace_id
  AND pm.type = 'receipt'
  AND pm.name = r.receipt_type::text
  AND r.receipt_type::text NOT IN ('0', '1', '2', '3', '4');

-- Step 2: 用 receipt_type 數字對應 code 兜回去
UPDATE public.receipts r
SET payment_method_id = pm.id
FROM public.payment_methods pm
WHERE r.payment_method_id IS NULL
  AND pm.workspace_id = r.workspace_id
  AND pm.type = 'receipt'
  AND pm.code = CASE r.receipt_type::text
    WHEN '0' THEN 'TRANSFER'
    WHEN '1' THEN 'CASH'
    WHEN '2' THEN 'CREDIT_CARD'
    WHEN '3' THEN 'CHECK'
    WHEN '4' THEN 'LINKPAY'
    ELSE NULL
  END;

-- Step 3: 用 payment_method 字串大類對應（最後 fallback）
UPDATE public.receipts r
SET payment_method_id = pm.id
FROM public.payment_methods pm
WHERE r.payment_method_id IS NULL
  AND pm.workspace_id = r.workspace_id
  AND pm.type = 'receipt'
  AND pm.code = CASE r.payment_method
    WHEN 'transfer' THEN 'TRANSFER'
    WHEN 'cash' THEN 'CASH'
    WHEN 'card' THEN 'CREDIT_CARD'
    WHEN 'credit_card' THEN 'CREDIT_CARD'
    WHEN 'check' THEN 'CHECK'
    WHEN 'linkpay' THEN 'LINKPAY'
    ELSE NULL
  END;

-- 報告：剩餘 payment_method_id 為 NULL 的筆數（無 system method 對應、admin 手動處理）
DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM public.receipts WHERE payment_method_id IS NULL;
  IF null_count > 0 THEN
    RAISE NOTICE 'Backfill done. % receipts still have NULL payment_method_id (workspace 沒對應 method、admin 自行處理)', null_count;
  END IF;
END $$;
