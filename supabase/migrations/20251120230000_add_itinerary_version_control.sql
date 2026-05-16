-- Add version control columns to itineraries table
BEGIN;

-- Add version control columns
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_id text REFERENCES public.itineraries(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_latest boolean DEFAULT true;

-- Add comments
COMMENT ON COLUMN public.itineraries.version IS 'Version number of the itinerary (v1, v2, v3, etc.)';
COMMENT ON COLUMN public.itineraries.parent_id IS 'ID of the parent itinerary (for version tracking)';
COMMENT ON COLUMN public.itineraries.is_latest IS 'Whether this is the latest version';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_itineraries_parent_id ON public.itineraries(parent_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_is_latest ON public.itineraries(is_latest) WHERE is_latest = true;
CREATE INDEX IF NOT EXISTS idx_itineraries_version ON public.itineraries(version);

COMMIT;
