-- MIGRATION: Create tables for the Timebox feature with a cloud-native architecture.

-- Table for 'Base Boxes' - these are the templates for schedule items.
CREATE TABLE IF NOT EXISTS public.timebox_boxes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    color text,
    type text,
    -- Field for the user's requested 'template' feature
    default_content jsonb
);
COMMENT ON TABLE public.timebox_boxes IS 'Stores user-defined templates for timebox items.';

-- Table for 'Week Records' - represents a specific week in the calendar.
CREATE TABLE IF NOT EXISTS public.timebox_weeks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_start date NOT NULL,
    name text,
    archived boolean DEFAULT false NOT NULL
);
COMMENT ON TABLE public.timebox_weeks IS 'Represents a single week for a user to schedule boxes in.';

-- Table for 'Scheduled Boxes' - an instance of a Base Box placed on the calendar.
CREATE TABLE IF NOT EXISTS public.timebox_scheduled_boxes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    box_id uuid REFERENCES public.timebox_boxes(id) ON DELETE CASCADE NOT NULL,
    week_id uuid REFERENCES public.timebox_weeks(id) ON DELETE CASCADE NOT NULL,
    day_of_week smallint NOT NULL, -- 0 (Sun) to 6 (Sat)
    start_time time NOT NULL,
    duration integer NOT NULL, -- in minutes
    completed boolean DEFAULT false NOT NULL,
    -- 'data' stores the actual content, e.g., workout details, which can be pre-filled from the BaseBox's default_content
    data jsonb
);
COMMENT ON TABLE public.timebox_scheduled_boxes IS 'An instance of a timebox placed onto a specific week and day.';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS timebox_boxes_user_id_idx ON public.timebox_boxes (user_id);
CREATE INDEX IF NOT EXISTS timebox_weeks_user_id_week_start_idx ON public.timebox_weeks (user_id, week_start);
CREATE INDEX IF NOT EXISTS timebox_scheduled_boxes_user_id_week_id_idx ON public.timebox_scheduled_boxes (user_id, week_id);

-- Enable RLS and define policies for all new tables
-- timebox_boxes
ALTER TABLE public.timebox_boxes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own timebox_boxes" ON public.timebox_boxes;
CREATE POLICY "Users can manage their own timebox_boxes"
ON public.timebox_boxes FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- timebox_weeks
ALTER TABLE public.timebox_weeks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own timebox_weeks" ON public.timebox_weeks;
CREATE POLICY "Users can manage their own timebox_weeks"
ON public.timebox_weeks FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- timebox_scheduled_boxes
ALTER TABLE public.timebox_scheduled_boxes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own scheduled boxes" ON public.timebox_scheduled_boxes;
CREATE POLICY "Users can manage their own scheduled boxes"
ON public.timebox_scheduled_boxes FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
