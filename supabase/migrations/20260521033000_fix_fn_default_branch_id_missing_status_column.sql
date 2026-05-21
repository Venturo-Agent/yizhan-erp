-- 治本：fn_default_branch_id() 動態判斷 status 欄位
--
-- 背景：
--   舊版第一行寫死 `IF NEW.status = 'template'`、預設所有掛這 trigger 的表都有 status 欄位。
--   實際 30 張表掛了 trg_default_branch_id、其中 11 張沒有 status 欄位、INSERT 即爆
--   「record "new" has no field "status"」。2026-05-21 新增請款明細實際踩到。
--
-- 影響表（沒 status 欄、舊版會炸的）：
--   customers, disbursement_order_items, order_members, payment_request_items,
--   receipt_invoice_allocations, salary_settlement_items, tour_bonus_settings,
--   tour_documents, tour_itinerary_items, tour_meal_settings, travel_invoice_voids
--
-- 修法：
--   用 `(to_jsonb(NEW) ->> 'status') = 'template'` 取代 `NEW.status = 'template'`。
--   jsonb 對不存在的 key 取出 NULL、NULL = 'template' 為 false、安全跳過 template 邏輯、不會炸。
--   對「有 status 欄」的表（tours / orders / payment_requests 等）行為完全等價。
--
-- 對齊憲法紅線 E（同表寫入邏輯只能一個地方）的精神：
--   通用 trigger function 不該預設所有表都有相同欄位、必須做欄位存在性判斷。

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_default_branch_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid;
  v_branch uuid;
BEGIN
  -- 動態讀 status：欄位不存在會回 NULL、不會炸
  IF (to_jsonb(NEW) ->> 'status') = 'template' THEN
    NEW.branch_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.branch_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT branch_id INTO v_branch
  FROM public.employees WHERE user_id = v_uid LIMIT 1;

  IF v_branch IS NOT NULL THEN
    NEW.branch_id := v_branch;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- CREATE OR REPLACE FUNCTION public.fn_default_branch_id()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- DECLARE
--   v_uid uuid;
--   v_branch uuid;
-- BEGIN
--   IF NEW.status = 'template' THEN
--     NEW.branch_id := NULL;
--     RETURN NEW;
--   END IF;
--   IF NEW.branch_id IS NOT NULL THEN
--     RETURN NEW;
--   END IF;
--   v_uid := auth.uid();
--   IF v_uid IS NULL THEN
--     RETURN NEW;
--   END IF;
--   SELECT branch_id INTO v_branch
--   FROM public.employees WHERE user_id = v_uid LIMIT 1;
--   IF v_branch IS NOT NULL THEN
--     NEW.branch_id := v_branch;
--   END IF;
--   RETURN NEW;
-- END;
-- $function$;
-- COMMIT;
