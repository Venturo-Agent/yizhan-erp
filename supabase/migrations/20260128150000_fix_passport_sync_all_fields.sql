-- 修正護照同步觸發器：當任何護照欄位變更時，同步所有護照欄位
-- 這確保訂單成員不會有空欄位

BEGIN;

CREATE OR REPLACE FUNCTION sync_customer_passport_to_members()
RETURNS TRIGGER AS $$
BEGIN
  -- 當任何護照相關欄位變更時，同步所有護照資料
  IF (
    OLD.passport_number IS DISTINCT FROM NEW.passport_number OR
    OLD.passport_name IS DISTINCT FROM NEW.passport_name OR
    OLD.passport_expiry IS DISTINCT FROM NEW.passport_expiry OR
    OLD.passport_image_url IS DISTINCT FROM NEW.passport_image_url OR
    OLD.birth_date IS DISTINCT FROM NEW.birth_date OR
    OLD.gender IS DISTINCT FROM NEW.gender OR
    OLD.national_id IS DISTINCT FROM NEW.national_id
  ) THEN
    -- 同步所有護照欄位（用顧客的最新資料覆蓋）
    UPDATE public.order_members
    SET
      passport_number = COALESCE(NEW.passport_number, passport_number),
      passport_name = COALESCE(NEW.passport_name, passport_name),
      passport_expiry = COALESCE(NEW.passport_expiry, passport_expiry),
      passport_image_url = COALESCE(NEW.passport_image_url, passport_image_url),
      birth_date = COALESCE(NEW.birth_date, birth_date),
      gender = COALESCE(NEW.gender, gender),
      id_number = COALESCE(NEW.national_id, id_number)
    WHERE customer_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
