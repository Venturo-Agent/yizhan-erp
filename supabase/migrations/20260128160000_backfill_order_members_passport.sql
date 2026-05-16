-- 一次性修復：從顧客主檔補齊訂單成員的空護照資料

BEGIN;

UPDATE order_members om
SET
  passport_number = COALESCE(om.passport_number, c.passport_number),
  passport_name = COALESCE(om.passport_name, c.passport_name),
  passport_expiry = COALESCE(om.passport_expiry, c.passport_expiry),
  passport_image_url = COALESCE(om.passport_image_url, c.passport_image_url),
  birth_date = COALESCE(om.birth_date, c.birth_date),
  gender = COALESCE(om.gender, c.gender),
  id_number = COALESCE(om.id_number, c.national_id)
FROM customers c
WHERE om.customer_id::text = c.id::text
  AND om.customer_id IS NOT NULL;

COMMIT;
