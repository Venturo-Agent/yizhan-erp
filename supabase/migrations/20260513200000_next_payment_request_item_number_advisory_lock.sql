-- ─────────────────────────────────────────────────────────────────────────────
-- next_payment_request_item_number RPC + UNIQUE constraint
-- 2026-05-13 William 拍板（圓桌會議發現的撞號 P0）
--
-- 背景：
--   payment_request_items.item_number 過去是 client 端算 `existingItems.length + 1`、
--   無 advisory lock、無 UNIQUE constraint。兩個 process 同時新增品項到同一張請款單、
--   都讀到「目前 2 筆」、都算 index=3 → 兩筆都 INSERT 成功 → 重號。
--
--   對齊既有 SSOT pattern（generate_voucher_no / generate_request_no / generate_receipt_no
--   都已有 advisory lock）— 唯獨 payment_request_items 沒做、補上。
--
-- 修法：
--   1. RPC `next_payment_request_item_number(p_request_id)` 用 pg_advisory_xact_lock
--      （同一張請款單同時只能一個 process 算下一號、transaction 結束自動釋放）
--   2. UNIQUE constraint (request_id, item_number) 雙保險（萬一 RPC 邏輯有漏、DB 層擋）
--
-- 影響：
--   - 純新增（RPC + constraint）、不破壞既有資料
--   - service 層改用 RPC（見 payment-request.service.ts 對應 commit）
--   - 既有 item_number 格式不變：`{request.code}-{index}` 例：TYO241218A-R01-1
--
-- Rollback: 見末尾註解
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════ Step 1: RPC ════
CREATE OR REPLACE FUNCTION public.next_payment_request_item_number(
  p_request_id uuid
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_request_code text;
  v_lock_key bigint;
  v_last_index int;
  v_next_index int;
BEGIN
  -- 撈 request.code（item_number 前綴）
  SELECT code INTO v_request_code
  FROM public.payment_requests
  WHERE id = p_request_id;

  IF v_request_code IS NULL THEN
    RAISE EXCEPTION '找不到 payment_request 或 code 為空: %', p_request_id;
  END IF;

  -- advisory lock：同一張請款單同時只能一個 process 算下一號
  -- transaction commit/rollback 時自動釋放、不需手動 unlock
  v_lock_key := abs(hashtextextended('payment_request_item:' || p_request_id::text, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 鎖內查最大 index（item_number = `{code}-{index}` 格式、抓 `-` 後面的數字）
  SELECT COALESCE(MAX(
    CASE
      WHEN item_number ~ ('^' || regexp_replace(v_request_code, '([\.\^\$\*\+\?\(\)\[\]\{\}\|\\])', '\\\1', 'g') || '-\d+$')
      THEN (regexp_replace(item_number, '^' || regexp_replace(v_request_code, '([\.\^\$\*\+\?\(\)\[\]\{\}\|\\])', '\\\1', 'g') || '-', ''))::int
      ELSE 0
    END
  ), 0) INTO v_last_index
  FROM public.payment_request_items
  WHERE request_id = p_request_id;

  v_next_index := v_last_index + 1;

  RETURN v_request_code || '-' || v_next_index::text;
END;
$function$;

COMMENT ON FUNCTION public.next_payment_request_item_number(uuid) IS
  '產生請款品項下一個 item_number（{request.code}-{index} 格式、advisory lock 防競態）';

-- ════ Step 2: UNIQUE constraint 雙保險 ════
-- 先檢查現有資料是否有重複、避免 ALTER 失敗
DO $$
DECLARE
  v_dup_count int;
BEGIN
  SELECT count(*) INTO v_dup_count
  FROM (
    SELECT request_id, item_number, count(*)
    FROM public.payment_request_items
    WHERE item_number IS NOT NULL
    GROUP BY request_id, item_number
    HAVING count(*) > 1
  ) sub;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION '發現 % 組重複 (request_id, item_number)、必須先清理才能加 UNIQUE constraint', v_dup_count;
  END IF;
END $$;

ALTER TABLE public.payment_request_items
  ADD CONSTRAINT payment_request_items_request_item_number_unique
  UNIQUE (request_id, item_number);

-- ════ Step 3: 驗證 RPC + constraint 存在 ════
DO $$
DECLARE
  v_rpc_count int;
  v_constraint_count int;
BEGIN
  SELECT count(*) INTO v_rpc_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'next_payment_request_item_number';

  IF v_rpc_count = 0 THEN
    RAISE EXCEPTION 'RPC next_payment_request_item_number 沒建出來';
  END IF;

  SELECT count(*) INTO v_constraint_count
  FROM pg_constraint
  WHERE conname = 'payment_request_items_request_item_number_unique';

  IF v_constraint_count = 0 THEN
    RAISE EXCEPTION 'UNIQUE constraint 沒建出來';
  END IF;

  RAISE NOTICE '✓ RPC + UNIQUE constraint 都建好';
END $$;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- ALTER TABLE public.payment_request_items
--   DROP CONSTRAINT IF EXISTS payment_request_items_request_item_number_unique;
-- DROP FUNCTION IF EXISTS public.next_payment_request_item_number(uuid);
-- COMMIT;
