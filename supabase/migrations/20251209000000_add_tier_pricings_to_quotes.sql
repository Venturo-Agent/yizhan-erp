-- Add tier_pricings column to quotes table for storing tier pricing data
BEGIN;

ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS tier_pricings jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.quotes.tier_pricings IS 'Array of tier pricing objects with participant count and price per person';

COMMIT;
