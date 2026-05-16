-- Add foreign key constraint (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_request_items_request_id_fkey') THEN
    ALTER TABLE payment_request_items
    ADD CONSTRAINT payment_request_items_request_id_fkey
    FOREIGN KEY (request_id) REFERENCES payment_requests(id) ON DELETE CASCADE;
  END IF;
END $$;
