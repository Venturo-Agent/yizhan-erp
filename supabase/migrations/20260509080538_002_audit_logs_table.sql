-- =============================================================================
-- audit_logs table + DB trigger
-- 對應 ADR-0003 / refactor-backlog #16
-- =============================================================================
--
-- 執行條件：
--   1. 搬完伺服器（2026-05-10）
--   2. ADR-0003 拍板「雙軌路線」「哪些 table 加 trigger」
--   3. 軟刪除 migration 已 apply（001_soft_delete_columns.sql、配合 trigger）
--
-- 設計依 ADR-0003：
--   - 雙軌：DB trigger 兜底 + 應用層 helper 補 reason
--   - actor_id → employees(id)（CLAUDE.md 紅線 #2）
--   - workspace_id 索引（最常查）+ entity 索引 + actor 索引
--   - JSONB before/after、稽核時 diff 用
--
-- Rollback：
--   - DROP TRIGGER（每張 table 各一）
--   - DROP TABLE public.audit_logs
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_logs table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL,

  -- WHO
  actor_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
  -- WHEN
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- WHAT
  action TEXT NOT NULL,                  -- create | update | soft_delete | force_delete | login | capability_change
  entity_type TEXT NOT NULL,             -- orders | payments | customers | ...
  entity_id UUID NOT NULL,

  -- 變更內容
  before JSONB,                          -- update / delete 才有
  after JSONB,                           -- create / update 才有

  -- 業務上下文
  reason TEXT,                           -- 應用層手動填
  request_id UUID,                       -- 跟 Sentry trace 對應

  -- 環境
  ip INET,
  user_agent TEXT
);

COMMENT ON TABLE public.audit_logs IS '操作軌跡 / 對帳追溯。雙軌 = DB trigger 兜底 + 應用層補 reason';
COMMENT ON COLUMN public.audit_logs.actor_id IS '對應 employees(id)、不是 auth.users.id（紅線 #2）';
COMMENT ON COLUMN public.audit_logs.before IS 'NULL / JSONB diff、依 action 而定';
COMMENT ON COLUMN public.audit_logs.after IS 'NULL / JSONB diff、依 action 而定';

-- ─────────────────────────────────────────────────────────────────────────────
-- 索引（依 ADR-0003）
-- ─────────────────────────────────────────────────────────────────────────────

-- 最常查：「這個 workspace 最近的操作軌跡」
CREATE INDEX IF NOT EXISTS idx_audit_workspace_time
  ON public.audit_logs(workspace_id, created_at DESC);

-- 次常查：「這個 entity 的所有變更」
CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON public.audit_logs(entity_type, entity_id);

-- 較少查：「這個 actor 做了什麼」
CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON public.audit_logs(actor_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS：只能看自己 workspace 的 audit_logs（除 service_role）
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- 注意：不要 FORCE RLS（紅線 #1、跟 workspaces 同邏輯）

-- SELECT policy：只能看自己 workspace 的
CREATE POLICY audit_logs_select_own_workspace
  ON public.audit_logs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE id = auth.uid()
    )
  );

-- INSERT policy：只能寫自己 workspace 的（trigger / 應用層用）
CREATE POLICY audit_logs_insert_own_workspace
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE id = auth.uid()
    )
  );

-- UPDATE / DELETE 全禁（append-only）
-- 不寫 policy = 預設 deny

-- ─────────────────────────────────────────────────────────────────────────────
-- DB trigger function（兜底、不漏記）
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 用法：對每張要稽核的 table 加 trigger
--   CREATE TRIGGER audit_orders
--     AFTER INSERT OR UPDATE OR DELETE ON public.orders
--     FOR EACH ROW EXECUTE FUNCTION public.fn_record_audit();
--
-- 使用 current_setting() 拿 actor_id、應用層必須先 set：
--   SELECT set_config('app.current_actor_id', '<uuid>', true);

CREATE OR REPLACE FUNCTION public.fn_record_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_workspace_id UUID;
  v_action TEXT;
  v_entity_id UUID;
  v_before JSONB;
  v_after JSONB;
BEGIN
  -- actor_id：應用層必須先 set；fallback NULL
  BEGIN
    v_actor_id := NULLIF(current_setting('app.current_actor_id', true), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  -- 沒 actor、不記（避免污染 audit log；應用層應 enforce）
  IF v_actor_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 決定 action / before / after
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_after := to_jsonb(NEW);
    v_before := NULL;
    v_entity_id := NEW.id;
    v_workspace_id := NEW.workspace_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 軟刪除特殊處理
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
    workspace_id, actor_id, action, entity_type, entity_id, before, after
  ) VALUES (
    v_workspace_id,
    v_actor_id,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    v_before,
    v_after
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.fn_record_audit() IS
  'AFTER trigger function、自動記錄 INSERT / UPDATE / DELETE 到 audit_logs。應用層必須先 SELECT set_config(''app.current_actor_id'', ...)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 自動掛 trigger 到核心 table（依 ADR-0003 範圍）
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  target_table TEXT;
  audit_tables TEXT[] := ARRAY[
    'orders',
    'payments',
    'payment_requests',
    'disbursement_orders',
    'receipts',
    'customers',
    'tours',
    'employees',
    'role_capabilities',
    'company_settings'
  ];
BEGIN
  FOREACH target_table IN ARRAY audit_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = target_table
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS audit_%I ON public.%I',
        target_table,
        target_table
      );
      EXECUTE format(
        'CREATE TRIGGER audit_%I
          AFTER INSERT OR UPDATE OR DELETE ON public.%I
          FOR EACH ROW EXECUTE FUNCTION public.fn_record_audit()',
        target_table,
        target_table
      );
      RAISE NOTICE '✓ % trigger 已掛', target_table;
    ELSE
      RAISE NOTICE '✗ % 不存在、跳過', target_table;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- 驗證查詢
-- =============================================================================

-- 1. 確認 table 建好
-- SELECT * FROM public.audit_logs LIMIT 0;

-- 2. 確認 trigger 都掛了
-- SELECT trigger_name, event_object_table FROM information_schema.triggers
-- WHERE trigger_schema = 'public' AND trigger_name LIKE 'audit_%'
-- ORDER BY event_object_table;

-- 3. 應用層測試：
--   SELECT set_config('app.current_actor_id', '<some-employee-uuid>', true);
--   UPDATE public.orders SET total = 1000 WHERE id = '<some-id>';
--   SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT 1;
--   -- 預期：看到 update action、before / after diff
