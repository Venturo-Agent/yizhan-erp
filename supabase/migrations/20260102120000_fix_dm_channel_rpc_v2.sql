-- 修復 get_or_create_dm_channel RPC 函數
-- 問題：channel_type 必須是大寫 'DIRECT'

CREATE OR REPLACE FUNCTION public.get_or_create_dm_channel(p_user_1_id UUID, p_user_2_id UUID, p_workspace_id UUID)
RETURNS SETOF public.channels AS $$
DECLARE
  v_channel_id UUID;
BEGIN
  -- 查找已存在的 DM 頻道（兩個用戶都是成員）
  SELECT c.id INTO v_channel_id
  FROM public.channels c
  WHERE c.channel_type = 'DIRECT'
    AND c.workspace_id = p_workspace_id
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

  -- 如果沒找到，建立新頻道（channel_type 必須是大寫）
  INSERT INTO public.channels (workspace_id, created_by, name, channel_type, is_announcement)
  VALUES (p_workspace_id, p_user_1_id, 'dm:' || p_user_1_id || ':' || p_user_2_id, 'DIRECT', false)
  RETURNING id INTO v_channel_id;

  -- 加入兩個成員
  INSERT INTO public.channel_members (channel_id, employee_id, workspace_id, role)
  VALUES
    (v_channel_id, p_user_1_id, p_workspace_id, 'member'),
    (v_channel_id, p_user_2_id, p_workspace_id, 'member');

  -- 返回新建的頻道
  RETURN QUERY SELECT * FROM public.channels WHERE id = v_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
