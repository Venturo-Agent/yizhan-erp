-- Add FK (skip if table doesn't exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='receipt_payment_items' AND table_schema='public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'receipt_payment_items_receipt_id_fkey') THEN
      ALTER TABLE receipt_payment_items
      ADD CONSTRAINT receipt_payment_items_receipt_id_fkey
      FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;
