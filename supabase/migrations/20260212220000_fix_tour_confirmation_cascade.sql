-- Fix dangerous CASCADE on tour_confirmation_sheets.tour_id
-- Deleting a tour should NOT silently delete all confirmation sheets.
-- Change to RESTRICT so deletion is blocked if sheets exist.

ALTER TABLE tour_confirmation_sheets
  DROP CONSTRAINT tour_confirmation_sheets_tour_id_fkey,
  ADD CONSTRAINT tour_confirmation_sheets_tour_id_fkey
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE RESTRICT;
