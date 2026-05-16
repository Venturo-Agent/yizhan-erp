-- Creates a function to either find an existing DIRECT channel between two users or create a new one.
-- This ensures that there is only one DM channel per user pair in a workspace.
CREATE OR REPLACE FUNCTION public.get_or_create_dm_channel(p_user_1_id UUID, p_user_2_id UUID, p_workspace_id UUID)
RETURNS SETOF public.channels AS $$
DECLARE
  v_channel_id UUID;
BEGIN
  -- Find an existing DM channel that has both users as members.
  -- This is done by finding a DIRECT channel in the workspace where the count of matching members is 2.
  SELECT c.id INTO v_channel_id
  FROM public.channels c
  WHERE c.channel_type = 'DIRECT'
    AND c.workspace_id = p_workspace_id
    AND (
      SELECT count(*)
      FROM public.channel_members cm
      WHERE cm.channel_id = c.id AND (cm.member_id = p_user_1_id OR cm.member_id = p_user_2_id)
    ) = 2
  LIMIT 1;

  -- If a channel is found, return its details.
  IF v_channel_id IS NOT NULL THEN
    RETURN QUERY SELECT * FROM public.channels WHERE id = v_channel_id;
    RETURN;
  END IF;

  -- If no channel is found, create a new one.
  INSERT INTO public.channels (workspace_id, created_by, name, channel_type)
  VALUES (p_workspace_id, p_user_1_id, 'dm:' || p_user_1_id || ':' || p_user_2_id, 'DIRECT')
  RETURNING id INTO v_channel_id;

  -- Add both users as members to the new channel.
  INSERT INTO public.channel_members (channel_id, member_id)
  VALUES (v_channel_id, p_user_1_id), (v_channel_id, p_user_2_id);

  -- Return the details of the newly created channel.
  RETURN QUERY SELECT * FROM public.channels WHERE id = v_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution rights to the function to authenticated users.
GRANT EXECUTE ON FUNCTION public.get_or_create_dm_channel(UUID, UUID, UUID) TO authenticated;

