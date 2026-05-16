-- 修復跨 workspace DM 問題
-- 讓不同辦公室的同事可以互相私訊

CREATE OR REPLACE FUNCTION public.get_or_create_dm_channel(p_user_1_id UUID, p_user_2_id UUID, p_workspace_id UUID)
RETURNS SETOF public.channels AS $$
DECLARE
  v_channel_id UUID;
BEGIN
  -- 查找已存在的 DM 頻道（不限 workspace，只要兩個用戶都是成員）
  SELECT c.id INTO v_channel_id
  FROM public.channels c
  WHERE c.channel_type = 'DIRECT'
    AND (
      SELECT count(*)
      FROM public.channel_members cm
      WHERE cm.channel_id = c.id AND (cm.employee_id = p_user_1_id OR cm.employee_id = p_user_2_id)
    ) = 2
  LIMIT 1;

  -- 如果找到，直接返回
  IF v_channel_id IS NOT NULL THEN
    RETURN QUERY SELECT * FROM public.channels WHERE id = v_channel_id;
    RETURN;
  END IF;

  -- 如果沒找到，建立新頻道（使用發起者的 workspace）
  INSERT INTO public.channels (workspace_id, created_by, name, channel_type, is_announcement)
  VALUES (p_workspace_id, p_user_1_id, 'dm:' || p_user_1_id || ':' || p_user_2_id, 'DIRECT', false)
  RETURNING id INTO v_channel_id;

  -- 加入兩個成員（每個成員用自己的 workspace_id）
  INSERT INTO public.channel_members (channel_id, employee_id, workspace_id, role)
  SELECT v_channel_id, p_user_1_id, COALESCE(e.workspace_id, p_workspace_id), 'member'
  FROM public.employees e WHERE e.id = p_user_1_id;

  INSERT INTO public.channel_members (channel_id, employee_id, workspace_id, role)
  SELECT v_channel_id, p_user_2_id, COALESCE(e.workspace_id, p_workspace_id), 'member'
  FROM public.employees e WHERE e.id = p_user_2_id;

  -- 返回新建的頻道
  RETURN QUERY SELECT * FROM public.channels WHERE id = v_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
