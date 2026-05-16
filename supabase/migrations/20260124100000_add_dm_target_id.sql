-- Add dm_target_id to channels table for direct message channels
-- This allows quick lookup of the DM target without parsing channel name

-- Step 1: Add the column
ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS dm_target_id UUID REFERENCES public.employees(id);

COMMENT ON COLUMN public.channels.dm_target_id IS
  'For DIRECT channels: the other participant ID (from current user perspective). Eliminates need to parse channel name.';

-- Step 2: Backfill existing DM channels
-- For each DIRECT channel, find the "other" member from channel_members
-- Note: This sets dm_target_id to one of the two members (we pick the second one inserted)
-- The frontend will need to handle this by checking if dm_target_id === current user, then look up the other member

-- Actually, better approach: for DM channels, we need to know WHO is viewing
-- So dm_target_id should be set PER USER basis... but that doesn't work with single column

-- Alternative: Store BOTH user IDs in a smarter way
-- But for simplicity, let's make dm_target_id = the user who is NOT the creator (created_by)

UPDATE public.channels c
SET dm_target_id = (
  SELECT cm.employee_id
  FROM public.channel_members cm
  WHERE cm.channel_id = c.id
    AND cm.employee_id != c.created_by
  LIMIT 1
)
WHERE c.channel_type = 'DIRECT'
  AND c.dm_target_id IS NULL;

-- Step 3: Update the RPC function to set dm_target_id when creating new DM channels
CREATE OR REPLACE FUNCTION public.get_or_create_dm_channel(
  p_user_1_id UUID,    -- Current logged-in user
  p_user_2_id UUID,    -- Target user to chat with
  p_workspace_id UUID
)
RETURNS SETOF public.channels AS $$
DECLARE
  v_channel_id UUID;
BEGIN
  -- Step 1: Find existing DM channel between these two users
  SELECT c.id INTO v_channel_id
  FROM public.channels c
  WHERE c.channel_type = 'DIRECT'
    AND c.workspace_id = p_workspace_id
    AND (
      SELECT count(*)
      FROM public.channel_members cm
      WHERE cm.channel_id = c.id
        AND cm.employee_id IN (p_user_1_id, p_user_2_id)
    ) = 2
  LIMIT 1;

  -- Step 2: If found, return it
  IF v_channel_id IS NOT NULL THEN
    RETURN QUERY SELECT * FROM public.channels WHERE id = v_channel_id;
    RETURN;
  END IF;

  -- Step 3: Create new DM channel
  INSERT INTO public.channels (
    workspace_id,
    created_by,
    name,
    channel_type,
    is_announcement,
    dm_target_id  -- NEW: Store the target user directly
  ) VALUES (
    p_workspace_id,
    p_user_1_id,
    'dm:' || p_user_1_id || ':' || p_user_2_id,
    'DIRECT',
    false,
    p_user_2_id  -- The person user_1 wants to chat with
  )
  RETURNING id INTO v_channel_id;

  -- Step 4: Add both users as members
  INSERT INTO public.channel_members (
    channel_id,
    employee_id,
    workspace_id,
    role,
    status
  ) VALUES
    (v_channel_id, p_user_1_id, p_workspace_id, 'member', 'active'),
    (v_channel_id, p_user_2_id, p_workspace_id, 'member', 'active');

  -- Step 5: Return the new channel
  RETURN QUERY SELECT * FROM public.channels WHERE id = v_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
