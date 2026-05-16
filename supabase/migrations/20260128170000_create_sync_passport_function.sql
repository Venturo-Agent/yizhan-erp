-- 建立同步護照資料的 RPC 函數
-- 處理 customers.id (text) 與 order_members.customer_id (uuid) 類型不匹配問題

BEGIN;

CREATE OR REPLACE FUNCTION sync_passport_to_order_members(
  p_customer_id text,
  p_passport_number text DEFAULT NULL,
  p_passport_name text DEFAULT NULL,
  p_passport_expiry text DEFAULT NULL,
  p_passport_image_url text DEFAULT NULL,
  p_birth_date text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_id_number text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE order_members
  SET
    passport_number = COALESCE(p_passport_number, passport_number),
    passport_name = COALESCE(p_passport_name, passport_name),
    passport_expiry = COALESCE(p_passport_expiry, passport_expiry),
    passport_image_url = COALESCE(p_passport_image_url, passport_image_url),
    birth_date = COALESCE(p_birth_date, birth_date),
    gender = COALESCE(p_gender, gender),
    id_number = COALESCE(p_id_number, id_number)
  WHERE customer_id::text = p_customer_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION sync_passport_to_order_members IS
  '同步顧客護照資料到訂單成員（處理 uuid/text 類型轉換）';

COMMIT;
