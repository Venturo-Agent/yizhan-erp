-- =====================================================
-- 批量取得未讀訊息數量
-- 解決 N+1 查詢問題
-- =====================================================

-- 建立批量查詢未讀數的函數
CREATE OR REPLACE FUNCTION get_unread_counts_batch(p_conversation_ids uuid[])
RETURNS TABLE (
  conversation_id uuid,
  unread_count integer
) AS $$
BEGIN
  RETURN QUERY
  WITH member_last_read AS (
    -- 取得用戶在各對話的最後已讀訊息
    SELECT
      m.conversation_id,
      m.last_read_message_id,
      lr.created_at as last_read_at
    FROM public.traveler_conversation_members m
    LEFT JOIN public.traveler_messages lr ON lr.id = m.last_read_message_id
    WHERE m.conversation_id = ANY(p_conversation_ids)
    AND m.user_id = auth.uid()
  ),
  unread_messages AS (
    -- 計算每個對話的未讀數
    SELECT
      msg.conversation_id,
      COUNT(*) as cnt
    FROM public.traveler_messages msg
    LEFT JOIN member_last_read mlr ON mlr.conversation_id = msg.conversation_id
    WHERE msg.conversation_id = ANY(p_conversation_ids)
    AND msg.sender_id != auth.uid()
    AND msg.deleted_at IS NULL
    AND (
      mlr.last_read_at IS NULL  -- 從未讀過
      OR msg.created_at > mlr.last_read_at  -- 比已讀更新
    )
    GROUP BY msg.conversation_id
  )
  SELECT
    c.id as conversation_id,
    COALESCE(um.cnt, 0)::integer as unread_count
  FROM unnest(p_conversation_ids) AS c(id)
  LEFT JOIN unread_messages um ON um.conversation_id = c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_unread_counts_batch(uuid[]) IS '批量取得多個對話的未讀訊息數量';
