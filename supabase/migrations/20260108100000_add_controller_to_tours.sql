-- Migration: Add controller_id to tours table
-- Purpose: Track the tour controller (團控) responsible for managing the tour

BEGIN;

-- Add controller_id column to tours table
ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS controller_id uuid REFERENCES public.employees(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tours_controller_id ON public.tours(controller_id);

-- Add column comment
COMMENT ON COLUMN public.tours.controller_id IS 'Tour controller ID - the employee responsible for managing this tour (團控人員)';

COMMIT;
