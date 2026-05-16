-- payment_request_items: note → notes（統一欄位命名）
-- 20251130120000 把 notes 改成 note，但程式碼全面用 notes，需改回
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_request_items' AND column_name = 'note'
  ) THEN
    ALTER TABLE payment_request_items RENAME COLUMN note TO notes;
  END IF;
END $$;
