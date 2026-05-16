-- Step 1: Drop the existing comprehensive INSERT policy for messages.
-- This policy was too restrictive for general announcement channel use.
DROP POLICY IF EXISTS "Allow message inserts based on channel type" ON public.messages;

-- Step 2: Recreate a more permissive INSERT policy for messages.
-- This policy should allow any channel member to insert messages into their channels.
CREATE POLICY "Allow channel members to insert messages"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.channel_members
    WHERE channel_id = messages.channel_id AND employee_id = auth.uid()
  )
);

-- The SELECT policy created in the previous migration ("Allow members to read messages")
-- is already permissive enough (allows any channel member to read), so it can remain.
