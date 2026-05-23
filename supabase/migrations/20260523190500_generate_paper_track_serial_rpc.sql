-- 紙本字軌配號 RPC（代轉管理 階段 1）
--
-- 為什麼：紙本代轉開立時、要從指定收據本字軌取「下一個流水號」。
--   跟其他編號(@/lib/codes)一樣需防競態（兩人同時開立同字軌會撞號）、但邏輯特殊：
--   不是 workspace 全域流水、而是「鎖某一本字軌的 current_no、+1、檢查不超過迄號」。
--   配合單張作廢制：current_no 只增不減、作廢的號保留為 void row、不回收不重用。
--
-- 安全：
--   - workspace 驗證：p_workspace_id 必須等於字軌的 workspace（防跨租戶用別人的字軌配號）
--   - FOR UPDATE row lock：同字軌並發開立時序列化、防撞號
--   - 範圍檢查：超過迄號 raise（字軌用完要登記新收據本）

CREATE OR REPLACE FUNCTION public.generate_paper_track_serial(
  p_workspace_id uuid,
  p_track_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next integer;
  v_end  integer;
BEGIN
  -- 鎖該字軌 row、取下一號（current_no+1）
  SELECT current_no + 1, end_no
    INTO v_next, v_end
  FROM public.travel_invoice_paper_tracks
  WHERE id = p_track_id
    AND workspace_id = p_workspace_id
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '字軌不存在、未啟用、或不屬於此工作區';
  END IF;

  IF v_next > v_end THEN
    RAISE EXCEPTION '此字軌已用完（已達迄號 %）、請登記新收據本', v_end;
  END IF;

  UPDATE public.travel_invoice_paper_tracks
  SET current_no = v_next, updated_at = now()
  WHERE id = p_track_id;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_paper_track_serial(uuid, uuid) TO authenticated;

-- ════ Rollback ════
-- DROP FUNCTION IF EXISTS public.generate_paper_track_serial(uuid, uuid);
