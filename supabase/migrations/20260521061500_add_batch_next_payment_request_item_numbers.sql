-- ════════════════════════════════════════════════════════════════════
-- 加批次 RPC：next_payment_request_item_numbers(request_id, count)
-- ════════════════════════════════════════════════════════════════════
-- 為什麼：
--   原 next_payment_request_item_number(single) 在 client 端 loop 呼叫時、
--   每次都是獨立 transaction → 讀 DB 內 max(index) + 1、但 loop 中
--   新 items 還沒 insert、max 不變、N 個新 items 拿到同一個 item_number
--   → 撞 unique constraint payment_request_items_request_item_number_unique
--
--   譬喻：櫃台抽號機壞了、2 個業務同時拿掛號單都拿到 5 號、亂掉。
--
-- 修法：
--   新 RPC 在單一 transaction 內、一個 advisory lock、內部 loop 遞增、
--   回 text[]。client 不再 in-loop 呼叫單個 RPC、改成一次拿 N 個。
--
--   保留舊 single RPC、其他單筆呼叫不 break。
--
-- 紅線：
--   pg_advisory_xact_lock 在 transaction commit/rollback 自動釋放、
--   不需手動 unlock。同 request 並行 2 user 編輯仍序列化、不撞。
-- ════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.next_payment_request_item_numbers(
  p_request_id uuid,
  p_count int
)
RETURNS text[]
LANGUAGE plpgsql
AS $function$
DECLARE
  v_request_code text;
  v_lock_key bigint;
  v_last_index int;
  v_result text[] := '{}';
  i int;
BEGIN
  -- 入參驗證
  IF p_count IS NULL OR p_count <= 0 THEN
    RAISE EXCEPTION 'p_count 必須 > 0、got: %', p_count;
  END IF;
  IF p_count > 1000 THEN
    RAISE EXCEPTION 'p_count 上限 1000（防濫用）、got: %', p_count;
  END IF;

  -- 撈 request.code（item_number 前綴）
  SELECT code INTO v_request_code
  FROM public.payment_requests
  WHERE id = p_request_id;

  IF v_request_code IS NULL THEN
    RAISE EXCEPTION '找不到 payment_request 或 code 為空: %', p_request_id;
  END IF;

  -- advisory lock：同 request 同時只一個 process 算下一批號
  -- transaction commit/rollback 自動釋放
  v_lock_key := abs(hashtextextended('payment_request_item:' || p_request_id::text, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 鎖內查最大 index（item_number = `{code}-{index}` 格式）
  SELECT COALESCE(MAX(
    CASE
      WHEN item_number ~ ('^' || regexp_replace(v_request_code, '([\.\^\$\*\+\?\(\)\[\]\{\}\|\\])', '\\\1', 'g') || '-\d+$')
      THEN (regexp_replace(item_number, '^' || regexp_replace(v_request_code, '([\.\^\$\*\+\?\(\)\[\]\{\}\|\\])', '\\\1', 'g') || '-', ''))::int
      ELSE 0
    END
  ), 0) INTO v_last_index
  FROM public.payment_request_items
  WHERE request_id = p_request_id;

  -- 在 lock 內 loop 遞增、回 N 個編號
  FOR i IN 1..p_count LOOP
    v_result := array_append(v_result, v_request_code || '-' || (v_last_index + i)::text);
  END LOOP;

  RETURN v_result;
END;
$function$;

COMMENT ON FUNCTION public.next_payment_request_item_numbers(uuid, int) IS
  '批次取 N 個 payment_request_item item_number。'
  '修舊 single RPC 在 client loop 呼叫撞 unique 的 bug。'
  '單一 advisory lock + 內部遞增、不依賴 DB 既有 max 反查、'
  '同 request 並行多 user 仍序列化、不撞。';

-- 給 authenticated role 用（跟原 single RPC 一致）
GRANT EXECUTE ON FUNCTION public.next_payment_request_item_numbers(uuid, int) TO authenticated;

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）：
--
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.next_payment_request_item_numbers(uuid, int);
-- COMMIT;
-- ════════════════════════════════════════════════════════════════════
