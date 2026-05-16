-- =============================================================================
-- set_audit_context PG function
-- 對應 ADR-0003 / refactor-backlog #16 / 配 002_audit_logs_table.sql trigger
-- =============================================================================
--
-- 執行條件：
--   1. 002_audit_logs_table.sql 已 apply（trigger function 依賴此 setting）
--   2. 應用層 helper（src/lib/audit/set-audit-context.ts）對應上線
--
-- 為什麼要這個 function：
--   - DB trigger fn_record_audit 用 current_setting('app.current_actor_id') 拿 actor
--   - PostgREST 連線是 pool、跨 query 不 persist setting
--   - 解法：寫 RPC function、應用層 call rpc('set_audit_context', ...)、
--     PG 在同一連線內先 set 後再跑業務 query（同 connection scope）
--
-- 限制：
--   - Supabase JS SDK 的 RPC 跟業務 query 各自獨立 HTTP request、
--     pool 可能分配到不同連線。實際 production 行為要 D+1 驗證。
--   - 若驗證失敗、改用 Edge Function 包 transaction、或在 PG 端整合
--     業務操作 + audit set 為單一 stored procedure。
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_audit_context(
  p_actor_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- is_local=false：對 connection 持續、避免 PostgREST 跨 query 失效
  -- 注意：同 pool connection 下次別人用會看到、所以每次操作前都該 set
  PERFORM set_config('app.current_actor_id', p_actor_id::TEXT, false);

  IF p_reason IS NOT NULL THEN
    PERFORM set_config('app.current_reason', p_reason, false);
  ELSE
    PERFORM set_config('app.current_reason', '', false);
  END IF;

  IF p_request_id IS NOT NULL THEN
    PERFORM set_config('app.current_request_id', p_request_id, false);
  ELSE
    PERFORM set_config('app.current_request_id', '', false);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.set_audit_context(UUID, TEXT, TEXT) IS
  '應用層在做業務 query 前先 call、設 PG session 變數、給 fn_record_audit trigger 抓 actor / reason / request_id';

-- =============================================================================
-- 升級 fn_record_audit、抓 reason 跟 request_id（之前只抓 actor_id）
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_record_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_reason TEXT;
  v_request_id UUID;
  v_workspace_id UUID;
  v_action TEXT;
  v_entity_id UUID;
  v_before JSONB;
  v_after JSONB;
BEGIN
  BEGIN
    v_actor_id := NULLIF(current_setting('app.current_actor_id', true), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF v_actor_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- reason / request_id 補抓（升級點）
  BEGIN
    v_reason := NULLIF(current_setting('app.current_reason', true), '');
  EXCEPTION WHEN OTHERS THEN
    v_reason := NULL;
  END;

  BEGIN
    v_request_id := NULLIF(current_setting('app.current_request_id', true), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_request_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_after := to_jsonb(NEW);
    v_before := NULL;
    v_entity_id := NEW.id;
    v_workspace_id := NEW.workspace_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.deleted_at IS NULL) AND (NEW.deleted_at IS NOT NULL) THEN
      v_action := 'soft_delete';
    ELSIF (OLD.deleted_at IS NOT NULL) AND (NEW.deleted_at IS NULL) THEN
      v_action := 'restore';
    ELSE
      v_action := 'update';
    END IF;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    v_entity_id := NEW.id;
    v_workspace_id := NEW.workspace_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'force_delete';
    v_before := to_jsonb(OLD);
    v_after := NULL;
    v_entity_id := OLD.id;
    v_workspace_id := OLD.workspace_id;
  END IF;

  INSERT INTO public.audit_logs (
    workspace_id, actor_id, action, entity_type, entity_id, before, after, reason, request_id
  ) VALUES (
    v_workspace_id,
    v_actor_id,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    v_before,
    v_after,
    v_reason,
    v_request_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 驗證
-- =============================================================================

-- 1. 設 actor 並跑 update、看 audit_log 有沒有 actor / reason
-- SELECT public.set_audit_context(
--   'employee-uuid-here'::uuid,
--   'test reason',
--   'req-123'
-- );
-- UPDATE public.orders SET total = 999 WHERE id = '<some-uuid>';
-- SELECT actor_id, reason, request_id FROM public.audit_logs ORDER BY created_at DESC LIMIT 1;
-- 預期：actor_id 對、reason='test reason'、request_id 不為空

-- 2. 沒 set actor 跑 update、應跳過 audit log（trigger early return）
-- SELECT public.set_audit_context(NULL);  -- ← 這個 call 會錯、因為 NULL
-- 替代：直接跑 update without setting context
-- → audit_logs 不該新增
