-- Remove duplicate meeting_points column (use meeting_info instead)
BEGIN;

-- Drop the duplicate column
ALTER TABLE public.itineraries
DROP COLUMN IF EXISTS meeting_points;

COMMIT;
