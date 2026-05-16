-- hotels 表加 phone 欄位（統一三表都用 phone）
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS phone text;
UPDATE hotels SET phone = booking_phone WHERE booking_phone IS NOT NULL AND phone IS NULL;
