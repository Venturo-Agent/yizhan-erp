-- Add version_records column to itineraries table (like quotes)
-- This stores all versions in one record instead of multiple records

BEGIN;

-- Add version_records column (JSONB array)
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS version_records jsonb DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN public.itineraries.version_records IS 'Array of version records, each containing: id, version, note, daily_itinerary, features, etc., created_at';

-- Remove old version control columns (optional - keep for backwards compatibility during migration)
-- We'll keep them for now but stop using them in code

COMMIT;
