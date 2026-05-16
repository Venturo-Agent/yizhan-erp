-- Add showFeatures column to itineraries table
BEGIN;

ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS show_features boolean DEFAULT false;

COMMENT ON COLUMN public.itineraries.show_features IS 'Whether to show features section in the itinerary';

COMMIT;
