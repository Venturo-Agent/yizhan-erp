-- Step 1: Create a helper function to check if a user is an admin.
-- This function checks the 'roles' array in the 'employees' table.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.employees
    WHERE id = p_user_id AND 'admin' = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution rights to the function to authenticated users.
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Step 2: Ensure RLS is enabled on the messages table.
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing insert policies on the messages table to avoid conflicts.
-- It's safer to recreate a single, comprehensive policy.
DROP POLICY IF EXISTS "Allow individual members to insert" ON public.messages;
DROP POLICY IF EXISTS "Allow message inserts based on channel type" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;


-- Step 4: Create the new, comprehensive INSERT policy.
-- This policy allows insertion based on channel type and user role.
CREATE POLICY "Allow message inserts based on channel type"
ON public.messages
FOR INSERT
WITH CHECK (
  (
    -- Case 1: For announcement channels, the user must be an admin.
    (SELECT is_announcement FROM public.channels WHERE id = messages.channel_id) = TRUE
    AND
    public.is_admin(auth.uid())
  )
  OR
  (
    -- Case 2: For regular (non-announcement) channels, the user must be a member of the channel.
    (SELECT is_announcement FROM public.channels WHERE id = messages.channel_id) = FALSE
    AND
    EXISTS (
      SELECT 1
      FROM public.channel_members
      WHERE channel_id = messages.channel_id AND employee_id = auth.uid()
    )
  )
);

-- Optional: Re-affirm a permissive SELECT policy if needed, assuming members can read.
DROP POLICY IF EXISTS "Allow members to read messages" ON public.messages;
CREATE POLICY "Allow members to read messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.channel_members
    WHERE channel_id = messages.channel_id AND employee_id = auth.uid()
  )
);