-- Migration to fix and enforce granular Row Level Security on the user_preferences table.

-- 1. Ensure RLS is enabled on the table.
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies for a clean slate.
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;

-- 3. Create granular policies for each action.
-- This allows fine-grained control, as requested by the user.

-- Policy for READING (SELECT)
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

-- Policy for CREATING (INSERT)
CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for MODIFYING (UPDATE)
CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for DELETING (Admins only)
CREATE POLICY "Admins can delete preferences"
ON public.user_preferences FOR DELETE
USING ( (SELECT auth.jwt() ->> 'role') = 'admin' );


-- NOTE: Regular users cannot delete, only admins can.

COMMENT ON POLICY "Users can view their own preferences" ON public.user_preferences 
IS 'Ensures users can only read their own preference records.';
COMMENT ON POLICY "Users can insert their own preferences" ON public.user_preferences 
IS 'Ensures users can only create preference records for themselves.';
COMMENT ON POLICY "Users can update their own preferences" ON public.user_preferences 
IS 'Ensures users can only update their own preference records.';
COMMENT ON POLICY "Admins can delete preferences" ON public.user_preferences
IS 'Allows administrators to delete any user preference records.';
