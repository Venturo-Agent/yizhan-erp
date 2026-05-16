-- =============================================
-- Migration: DROP employees.supabase_user_id 收尾（F3）
-- 2026-05-02
--
-- 背景：
--   E1 (20260502200000) 已把 user_id 設為新真相、加 trigger 雙向同步
--   F3 已將 src 54 處 supabase_user_id 引用全部改成 user_id（type-check 0 errors）
--   本 migration 收尾：清掉 DB 端所有 supabase_user_id 引用、最後 DROP COLUMN
--
-- 步驟：
--   A. Safety check：確保所有 active employees 都有 user_id
--   B. 重建 11 條 RLS policies、移除 OR e.supabase_user_id 段（E2 兼容寫法）
--   C. 重建 5 個 SECURITY DEFINER functions（移除 supabase_user_id 引用）
--   D. DROP TRIGGER trg_sync_employee_user_id + DROP FUNCTION sync_employee_user_id
--   E. DROP COLUMN employees.supabase_user_id
--
-- 不動：
--   - is_super_admin() / has_capability_* （E1 已用 e.user_id）
--   - 個人記帳 / channels / 其他無關 policies
-- =============================================

BEGIN;

-- ============================================================
-- A. Safety check
-- ============================================================

DO $$
DECLARE
  v_unfixable integer;
BEGIN
  SELECT count(*) INTO v_unfixable
  FROM public.employees
  WHERE status = 'active'
    AND user_id IS NULL
    AND supabase_user_id IS NOT NULL;

  IF v_unfixable > 0 THEN
    RAISE EXCEPTION '[F3] safety check failed: % active employees have supabase_user_id but missing user_id. trigger 應該已同步、請檢查', v_unfixable;
  END IF;
END$$;

-- ============================================================
-- B. 重建 11 條 RLS policies、移除 supabase_user_id 兼容
-- ============================================================

-- B.1 itineraries_select
DROP POLICY IF EXISTS "itineraries_select" ON public.itineraries;
CREATE POLICY "itineraries_select" ON public.itineraries
  FOR SELECT
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'tours.read')
    OR (workspace_id = (SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1))
  );

-- B.2 messages_select
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'channel.read')
    OR (workspace_id = (SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1))
  );

-- B.3 michelin_restaurants_select
DROP POLICY IF EXISTS "michelin_restaurants_select" ON public.michelin_restaurants;
CREATE POLICY "michelin_restaurants_select" ON public.michelin_restaurants
  FOR SELECT
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.read')
    OR (workspace_id = (SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1))
  );

-- B.4 premium_experiences_select
DROP POLICY IF EXISTS "premium_experiences_select" ON public.premium_experiences;
CREATE POLICY "premium_experiences_select" ON public.premium_experiences
  FOR SELECT
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'database.read')
    OR (workspace_id = (SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1))
  );

-- B.5 todo_columns_select
DROP POLICY IF EXISTS "todo_columns_select" ON public.todo_columns;
CREATE POLICY "todo_columns_select" ON public.todo_columns
  FOR SELECT
  USING (
    is_super_admin()
    OR has_capability_for_workspace(workspace_id, 'todos.read')
    OR (workspace_id = (SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1))
  );

-- B.6 tour_custom_cost_fields_select
DROP POLICY IF EXISTS "tour_custom_cost_fields_select" ON public.tour_custom_cost_fields;
CREATE POLICY "tour_custom_cost_fields_select" ON public.tour_custom_cost_fields
  FOR SELECT
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_custom_cost_fields.tour_id
        AND (
          has_capability_for_workspace(t.workspace_id, 'tours.read')
          OR (t.workspace_id = (SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1))
        )
    )
  );

-- B.7 tour_departure_data_select
DROP POLICY IF EXISTS "tour_departure_data_select" ON public.tour_departure_data;
CREATE POLICY "tour_departure_data_select" ON public.tour_departure_data
  FOR SELECT
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_departure_data.tour_id
        AND (
          has_capability_for_workspace(t.workspace_id, 'tours.read')
          OR (t.workspace_id = (SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1))
        )
    )
  );

-- B.8 tour_member_fields_select
DROP POLICY IF EXISTS "tour_member_fields_select" ON public.tour_member_fields;
CREATE POLICY "tour_member_fields_select" ON public.tour_member_fields
  FOR SELECT
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_member_fields.tour_id
        AND (
          has_capability_for_workspace(t.workspace_id, 'tours.read')
          OR (t.workspace_id = (SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1))
        )
    )
  );

-- B.9 advance_lists_select
DROP POLICY IF EXISTS "advance_lists_select" ON public.advance_lists;
CREATE POLICY "advance_lists_select" ON public.advance_lists
  FOR SELECT
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = advance_lists.channel_id
        AND (
          has_capability_for_workspace(c.workspace_id, 'finance.read')
          OR (c.workspace_id = (SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1))
        )
    )
  );

-- B.10 advance_items_select
DROP POLICY IF EXISTS "advance_items_select" ON public.advance_items;
CREATE POLICY "advance_items_select" ON public.advance_items
  FOR SELECT
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.advance_lists al
      JOIN public.channels c ON c.id = al.channel_id
      WHERE al.id = advance_items.advance_list_id
        AND (
          has_capability_for_workspace(c.workspace_id, 'finance.read')
          OR (c.workspace_id = (SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1))
        )
    )
  );

-- B.11 shared_order_lists_select
DROP POLICY IF EXISTS "shared_order_lists_select" ON public.shared_order_lists;
CREATE POLICY "shared_order_lists_select" ON public.shared_order_lists
  FOR SELECT
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = shared_order_lists.channel_id
        AND (
          has_capability_for_workspace(c.workspace_id, 'orders.read')
          OR (c.workspace_id = (SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid() LIMIT 1))
        )
    )
  );

-- ============================================================
-- C. 重建 SECURITY DEFINER functions
-- ============================================================

-- C.1 get_current_user_workspace
CREATE OR REPLACE FUNCTION public.get_current_user_workspace()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  ws_id uuid;
  current_uid uuid;
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT e.workspace_id INTO ws_id
  FROM public.employees e
  WHERE e.user_id = current_uid
  LIMIT 1;

  IF ws_id IS NOT NULL THEN
    RETURN ws_id;
  END IF;

  -- 備用：從 auth.users.raw_user_meta_data.workspace_id 取得
  SELECT (au.raw_user_meta_data->>'workspace_id')::uuid INTO ws_id
  FROM auth.users au
  WHERE au.id = current_uid;

  RETURN ws_id;
END;
$function$;

-- C.2 get_current_employee_id
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  emp_id uuid;
  current_uid uuid;
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- 方法 1: 從 auth.users.raw_user_meta_data 取得（最快）
  BEGIN
    SELECT (raw_user_meta_data->>'employee_id')::uuid INTO emp_id
    FROM auth.users
    WHERE id = current_uid;

    IF emp_id IS NOT NULL THEN
      RETURN emp_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 方法 2: 從 employees 表格用 user_id 對應
  SELECT e.id INTO emp_id
  FROM public.employees e
  WHERE e.user_id = current_uid
  LIMIT 1;

  RETURN emp_id;
END;
$function$;

-- C.3 is_employee
CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  current_uid uuid;
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = current_uid
      AND e.status != 'terminated'
  );
END;
$function$;

-- C.4 send_tour_message
CREATE OR REPLACE FUNCTION public.send_tour_message(p_conversation_id uuid, p_content text, p_type text DEFAULT 'text'::text, p_attachments jsonb DEFAULT '[]'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_message_id uuid;
  employee_record RECORD;
BEGIN
  SELECT e.id, e.user_id INTO employee_record
  FROM public.employees e
  WHERE e.user_id = auth.uid()
  LIMIT 1;

  IF employee_record.id IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  INSERT INTO public.traveler_conversation_members (
    conversation_id, employee_id, member_type, role
  ) VALUES (
    p_conversation_id, employee_record.id, 'employee', 'admin'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.traveler_messages (
    conversation_id,
    sender_id,
    type,
    content,
    attachments,
    metadata
  ) VALUES (
    p_conversation_id,
    employee_record.user_id,
    p_type,
    p_content,
    p_attachments,
    jsonb_build_object('sender_type', 'employee', 'employee_id', employee_record.id)
  ) RETURNING id INTO new_message_id;

  RETURN new_message_id;
END;
$function$;

-- C.5 check_tour_member_modify_lock
CREATE OR REPLACE FUNCTION public.check_tour_member_modify_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_tour_status text;
  v_caller_role_name text;
  v_target_order_id text;
BEGIN
  v_target_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT t.status INTO v_tour_status
  FROM public.tours t
  JOIN public.orders o ON o.tour_id = t.id::text
  WHERE o.id::text = v_target_order_id;

  IF v_tour_status IS DISTINCT FROM 'ongoing' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF public.is_super_admin() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT wr.name INTO v_caller_role_name
  FROM public.employees e
  JOIN public.workspace_roles wr ON wr.id = e.role_id
  WHERE e.user_id = auth.uid()
  LIMIT 1;

  IF v_caller_role_name IS DISTINCT FROM '領隊' THEN
    RAISE EXCEPTION '出團當天 (tour status=ongoing) 只有領隊或系統主管能修改團員資料、當前職務: %',
      COALESCE(v_caller_role_name, '無');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- C.6 get_tour_conversations
CREATE OR REPLACE FUNCTION public.get_tour_conversations(p_workspace_id uuid)
RETURNS TABLE(conversation_id uuid, conversation_type text, tour_id uuid, tour_code text, tour_name text, departure_date date, is_open boolean, open_at timestamp with time zone, unread_count bigint, last_message_at timestamp with time zone, last_message_preview text, member_count bigint, traveler_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    c.id as conversation_id,
    c.type as conversation_type,
    c.tour_id,
    t.tour_code,
    t.name as tour_name,
    t.departure_date,
    c.is_open,
    c.open_at,
    (
      SELECT COUNT(*) FROM public.traveler_messages m
      WHERE m.conversation_id = c.id
      AND m.created_at > COALESCE(
        (SELECT last_read_at FROM public.traveler_conversation_members
         WHERE conversation_id = c.id AND employee_id = (
           SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1
         )),
        '1970-01-01'::timestamptz
      )
    ) as unread_count,
    c.last_message_at,
    c.last_message_preview,
    (SELECT COUNT(*) FROM public.traveler_conversation_members WHERE conversation_id = c.id AND left_at IS NULL) as member_count,
    (SELECT COUNT(*) FROM public.traveler_conversation_members WHERE conversation_id = c.id AND member_type = 'traveler' AND left_at IS NULL) as traveler_count
  FROM public.traveler_conversations c
  JOIN public.tours t ON t.id = c.tour_id
  WHERE c.workspace_id = p_workspace_id
  AND c.tour_id IS NOT NULL
  ORDER BY t.departure_date DESC, c.type;
END;
$function$;

-- C.7 log_file_download
CREATE OR REPLACE FUNCTION public.log_file_download(p_file_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_file RECORD;
  v_user_name TEXT;
BEGIN
  SELECT * INTO v_file FROM public.files WHERE id = p_file_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT chinese_name INTO v_user_name
  FROM public.employees
  WHERE user_id = auth.uid()
  LIMIT 1;

  INSERT INTO public.file_audit_logs (
    file_id, workspace_id, action, action_label,
    performed_by, performed_by_name
  ) VALUES (
    p_file_id, v_file.workspace_id, 'download', '下載檔案',
    auth.uid(), v_user_name
  );

  UPDATE public.files
  SET download_count = COALESCE(download_count, 0) + 1,
      last_accessed_at = now()
  WHERE id = p_file_id;
END;
$function$;

-- C.8 log_file_changes
CREATE OR REPLACE FUNCTION public.log_file_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_action file_action;
  v_action_label TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
  v_user_name TEXT;
BEGIN
  SELECT chinese_name INTO v_user_name
  FROM public.employees
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_action_label := '上傳了檔案';
    v_new_values := jsonb_build_object(
      'filename', NEW.filename,
      'folder_id', NEW.folder_id,
      'category', NEW.category
    );

    INSERT INTO public.file_audit_logs (
      file_id, workspace_id, action, action_label,
      performed_by, performed_by_name, new_values
    ) VALUES (
      NEW.id, NEW.workspace_id, v_action, v_action_label,
      auth.uid(), v_user_name, v_new_values
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.filename IS DISTINCT FROM NEW.filename THEN
      v_action := 'rename';
      v_action_label := '重新命名檔案';
      v_old_values := jsonb_build_object('filename', OLD.filename);
      v_new_values := jsonb_build_object('filename', NEW.filename);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    IF OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
      v_action := 'move';
      v_action_label := '移動檔案到其他資料夾';
      v_old_values := jsonb_build_object('folder_id', OLD.folder_id);
      v_new_values := jsonb_build_object('folder_id', NEW.folder_id);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    IF OLD.is_starred IS DISTINCT FROM NEW.is_starred THEN
      v_action := 'star';
      v_action_label := CASE WHEN NEW.is_starred THEN '加入星號' ELSE '移除星號' END;
      v_old_values := jsonb_build_object('is_starred', OLD.is_starred);
      v_new_values := jsonb_build_object('is_starred', NEW.is_starred);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    IF OLD.is_archived IS DISTINCT FROM NEW.is_archived THEN
      v_action := 'archive';
      v_action_label := CASE WHEN NEW.is_archived THEN '封存檔案' ELSE '解除封存' END;
      v_old_values := jsonb_build_object('is_archived', OLD.is_archived);
      v_new_values := jsonb_build_object('is_archived', NEW.is_archived);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    IF OLD.is_deleted IS DISTINCT FROM NEW.is_deleted THEN
      v_action := CASE WHEN NEW.is_deleted THEN 'delete' ELSE 'restore' END;
      v_action_label := CASE WHEN NEW.is_deleted THEN '刪除檔案' ELSE '還原檔案' END;
      v_old_values := jsonb_build_object('is_deleted', OLD.is_deleted);
      v_new_values := jsonb_build_object('is_deleted', NEW.is_deleted);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    IF OLD.category IS DISTINCT FROM NEW.category THEN
      v_action := 'update';
      v_action_label := '變更檔案分類';
      v_old_values := jsonb_build_object('category', OLD.category);
      v_new_values := jsonb_build_object('category', NEW.category);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
      v_action := 'update';
      v_action_label := '更新備註';
      v_old_values := jsonb_build_object('notes', OLD.notes);
      v_new_values := jsonb_build_object('notes', NEW.notes);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    IF OLD.version IS DISTINCT FROM NEW.version THEN
      v_action := 'version';
      v_action_label := '上傳新版本';
      v_old_values := jsonb_build_object('version', OLD.version);
      v_new_values := jsonb_build_object('version', NEW.version);

      INSERT INTO public.file_audit_logs (
        file_id, workspace_id, action, action_label,
        performed_by, performed_by_name, old_values, new_values
      ) VALUES (
        NEW.id, NEW.workspace_id, v_action, v_action_label,
        auth.uid(), v_user_name, v_old_values, v_new_values
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$;

-- ============================================================
-- D. 砍 sync trigger + function（不再需要、user_id 是 SSOT）
-- ============================================================

DROP TRIGGER IF EXISTS trg_sync_employee_user_id ON public.employees;
DROP FUNCTION IF EXISTS public.sync_employee_user_id();

-- ============================================================
-- E. DROP COLUMN
-- ============================================================

ALTER TABLE public.employees DROP COLUMN IF EXISTS supabase_user_id;

-- ============================================================
-- 紀錄到 schema_migrations 追蹤表（F5 收斂方向）
-- ============================================================

INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260502220000',
  'drop_supabase_user_id_column',
  ARRAY['-- F3: drop employees.supabase_user_id + 重建 11 policies + 8 functions']::text[]
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
