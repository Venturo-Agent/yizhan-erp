-- 同步顧客護照資料到訂單成員
-- 當 customers 表的護照資料更新時，自動同步到關聯的 order_members
-- 注意：只填充空值，不覆蓋已有的不同資料（衝突由前端處理）

BEGIN;

-- 建立同步函數
CREATE OR REPLACE FUNCTION sync_customer_passport_to_members()
RETURNS TRIGGER AS $$
BEGIN
  -- 只在護照相關欄位變更時才同步
  IF (
    OLD.passport_number IS DISTINCT FROM NEW.passport_number OR
    OLD.passport_name IS DISTINCT FROM NEW.passport_name OR
    OLD.passport_expiry IS DISTINCT FROM NEW.passport_expiry OR
    OLD.passport_image_url IS DISTINCT FROM NEW.passport_image_url OR
    OLD.birth_date IS DISTINCT FROM NEW.birth_date OR
    OLD.gender IS DISTINCT FROM NEW.gender OR
    OLD.national_id IS DISTINCT FROM NEW.national_id
  ) THEN
    -- 只更新成員資料為空的欄位（不覆蓋已有資料）
    UPDATE public.order_members
    SET
      passport_number = CASE WHEN passport_number IS NULL THEN NEW.passport_number ELSE passport_number END,
      passport_name = CASE WHEN passport_name IS NULL THEN NEW.passport_name ELSE passport_name END,
      passport_expiry = CASE WHEN passport_expiry IS NULL THEN NEW.passport_expiry ELSE passport_expiry END,
      passport_image_url = CASE WHEN passport_image_url IS NULL THEN NEW.passport_image_url ELSE passport_image_url END,
      birth_date = CASE WHEN birth_date IS NULL THEN NEW.birth_date ELSE birth_date END,
      gender = CASE WHEN gender IS NULL THEN NEW.gender ELSE gender END,
      id_number = CASE WHEN id_number IS NULL THEN NEW.national_id ELSE id_number END
    WHERE customer_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 移除舊的 trigger（如果存在）
DROP TRIGGER IF EXISTS trigger_sync_customer_passport ON public.customers;

-- 建立 trigger
CREATE TRIGGER trigger_sync_customer_passport
  AFTER UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION sync_customer_passport_to_members();

-- 加入註解
COMMENT ON FUNCTION sync_customer_passport_to_members() IS
  '當顧客護照資料更新時，自動同步到所有關聯的 order_members';

COMMIT;
