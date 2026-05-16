-- =====================================================
-- PNR System Enhancement Migration
-- 新增 7 張資料表 + 擴充現有表格
-- =====================================================

-- =====================================================
-- P0: 票價歷史
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pnr_fare_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pnr_id uuid NOT NULL REFERENCES public.pnr_records(id) ON DELETE CASCADE,

  -- 票價資料
  fare_basis text,
  currency char(3) DEFAULT 'TWD',
  base_fare numeric(12,2),
  taxes numeric(12,2),
  total_fare numeric(12,2) NOT NULL,

  -- 來源
  source text CHECK (source IN ('telegram', 'manual', 'api')) DEFAULT 'manual',
  raw_fare_data jsonb,

  -- 追蹤
  recorded_at timestamptz DEFAULT now(),
  recorded_by uuid REFERENCES public.employees(id),

  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.pnr_fare_history IS 'PNR 票價歷史記錄';
COMMENT ON COLUMN public.pnr_fare_history.source IS '資料來源：telegram(電報解析)、manual(手動輸入)、api(外部API)';

-- =====================================================
-- P0: 票價警報設定
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pnr_fare_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pnr_id uuid NOT NULL REFERENCES public.pnr_records(id) ON DELETE CASCADE,

  -- 警報設定
  alert_type text NOT NULL CHECK (alert_type IN ('price_increase', 'price_decrease', 'threshold')),
  threshold_amount numeric(12,2),
  threshold_percent numeric(5,2),

  -- 狀態
  is_active boolean DEFAULT true,
  last_fare numeric(12,2),
  last_checked_at timestamptz,

  -- 通知設定
  notify_channel_id uuid REFERENCES public.channels(id),
  notify_employee_ids uuid[],

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.pnr_fare_alerts IS 'PNR 票價警報設定';
COMMENT ON COLUMN public.pnr_fare_alerts.alert_type IS '警報類型：price_increase(漲價)、price_decrease(降價)、threshold(閾值)';

-- =====================================================
-- P0: 航班狀態歷史
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pnr_flight_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pnr_id uuid NOT NULL REFERENCES public.pnr_records(id) ON DELETE CASCADE,
  segment_id uuid REFERENCES public.pnr_segments(id) ON DELETE SET NULL,

  -- 航班資訊
  airline_code varchar(3) NOT NULL,
  flight_number varchar(10) NOT NULL,
  flight_date date NOT NULL,

  -- 訂位狀態
  booking_status text, -- HK, TK, UC, XX, HL, etc.

  -- 營運狀態
  operational_status text, -- ON_TIME, DELAYED, CANCELLED, GATE_CHANGE, DEPARTED, ARRIVED

  -- 詳細資訊
  delay_minutes integer,
  new_departure_time time,
  new_arrival_time time,
  gate_info varchar(20),
  remarks text,

  -- 來源
  source text CHECK (source IN ('telegram', 'api', 'manual')) DEFAULT 'telegram',
  external_data jsonb,

  recorded_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.pnr_flight_status_history IS 'PNR 航班狀態歷史';
COMMENT ON COLUMN public.pnr_flight_status_history.booking_status IS '訂位狀態：HK(確認)、TK(待開票)、UC(無法確認)、XX(取消)等';
COMMENT ON COLUMN public.pnr_flight_status_history.operational_status IS '營運狀態：ON_TIME、DELAYED、CANCELLED、GATE_CHANGE等';

-- =====================================================
-- P0: 航班訂閱（預留 API 接口）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.flight_status_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pnr_id uuid REFERENCES public.pnr_records(id) ON DELETE CASCADE,
  segment_id uuid REFERENCES public.pnr_segments(id) ON DELETE SET NULL,

  -- 監控的航班
  airline_code varchar(3) NOT NULL,
  flight_number varchar(10) NOT NULL,
  flight_date date NOT NULL,

  -- 通知設定
  notify_on text[] DEFAULT ARRAY['delay', 'cancel', 'gate_change'],
  notify_channel_id uuid REFERENCES public.channels(id),
  notify_employee_ids uuid[],

  -- 外部 API 設定（預留）
  external_provider text, -- 'flightaware', 'aviationstack', etc.
  external_subscription_id text,

  is_active boolean DEFAULT true,
  last_checked_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.flight_status_subscriptions IS '航班狀態訂閱（預留外部 API 接口）';
COMMENT ON COLUMN public.flight_status_subscriptions.external_provider IS '外部服務提供者：flightaware、aviationstack等';

-- =====================================================
-- P1: 內部任務 Queue
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pnr_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pnr_id uuid NOT NULL REFERENCES public.pnr_records(id) ON DELETE CASCADE,

  -- 任務類型
  queue_type text NOT NULL CHECK (queue_type IN (
    'pending_ticket',    -- 待開票
    'pending_confirm',   -- 待確認
    'schedule_change',   -- 航變處理
    'name_correction',   -- 姓名更正
    'seat_request',      -- 座位請求
    'ssr_pending',       -- SSR 未確認
    'revalidation',      -- 需 Revalidation
    'reissue',           -- 需 Reissue
    'refund',            -- 退票處理
    'custom'             -- 自訂任務
  )),

  priority integer DEFAULT 0, -- 數字越大越緊急

  -- 期限
  due_date timestamptz,
  reminder_at timestamptz,

  -- 狀態
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

  -- 指派
  assigned_to uuid REFERENCES public.employees(id),

  -- 詳情
  title text NOT NULL,
  description text,
  metadata jsonb,

  -- 完成資訊
  completed_at timestamptz,
  completed_by uuid REFERENCES public.employees(id),
  resolution_notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.employees(id)
);

COMMENT ON TABLE public.pnr_queue_items IS 'PNR 內部任務 Queue';
COMMENT ON COLUMN public.pnr_queue_items.queue_type IS '任務類型';
COMMENT ON COLUMN public.pnr_queue_items.priority IS '優先級，數字越大越緊急';

-- 索引
CREATE INDEX IF NOT EXISTS idx_pnr_queue_workspace_status ON public.pnr_queue_items(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_pnr_queue_due_date ON public.pnr_queue_items(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pnr_queue_assigned ON public.pnr_queue_items(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_pnr_queue_pnr ON public.pnr_queue_items(pnr_id);

-- =====================================================
-- P1: 航變追蹤
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pnr_schedule_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pnr_id uuid NOT NULL REFERENCES public.pnr_records(id) ON DELETE CASCADE,
  segment_id uuid REFERENCES public.pnr_segments(id) ON DELETE SET NULL,

  -- 變更類型
  change_type text NOT NULL CHECK (change_type IN (
    'time_change',       -- 時間變更
    'flight_change',     -- 航班號變更
    'route_change',      -- 航線變更
    'equipment_change',  -- 機型變更
    'cancellation'       -- 航班取消
  )),

  -- 原始資訊
  original_flight_number varchar(10),
  original_departure_time time,
  original_arrival_time time,
  original_departure_date date,

  -- 新資訊
  new_flight_number varchar(10),
  new_departure_time time,
  new_arrival_time time,
  new_departure_date date,

  -- 影響評估
  requires_revalidation boolean DEFAULT false,
  requires_reissue boolean DEFAULT false,
  requires_refund boolean DEFAULT false,

  -- 處理狀態
  status text DEFAULT 'pending' CHECK (status IN (
    'pending',      -- 待處理
    'contacted',    -- 已聯繫旅客
    'accepted',     -- 旅客接受
    'revalidated',  -- 已 Revalidate
    'reissued',     -- 已 Reissue
    'refunded',     -- 已退票
    'cancelled'     -- 無需處理
  )),

  -- 處理資訊
  processed_by uuid REFERENCES public.employees(id),
  processed_at timestamptz,
  notes text,

  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.pnr_schedule_changes IS 'PNR 航變追蹤';
COMMENT ON COLUMN public.pnr_schedule_changes.change_type IS '變更類型';
COMMENT ON COLUMN public.pnr_schedule_changes.status IS '處理狀態';

-- 索引
CREATE INDEX IF NOT EXISTS idx_pnr_schedule_changes_pnr ON public.pnr_schedule_changes(pnr_id);
CREATE INDEX IF NOT EXISTS idx_pnr_schedule_changes_status ON public.pnr_schedule_changes(workspace_id, status);

-- =====================================================
-- P2: AI 查詢記錄（可選）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pnr_ai_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pnr_id uuid REFERENCES public.pnr_records(id) ON DELETE CASCADE,

  -- 查詢
  query_text text NOT NULL,
  query_context jsonb, -- 解析後的 PNR 上下文

  -- 回應
  response_text text,
  response_metadata jsonb,

  -- 使用者
  queried_by uuid REFERENCES public.employees(id),

  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.pnr_ai_queries IS 'PNR AI 助手查詢記錄';

-- =====================================================
-- 擴充現有 pnr_records 表格
-- =====================================================
ALTER TABLE public.pnr_records
  ADD COLUMN IF NOT EXISTS current_fare numeric(12,2),
  ADD COLUMN IF NOT EXISTS fare_currency char(3) DEFAULT 'TWD',
  ADD COLUMN IF NOT EXISTS ticket_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS has_schedule_change boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS queue_count integer DEFAULT 0;

COMMENT ON COLUMN public.pnr_records.current_fare IS '目前票價';
COMMENT ON COLUMN public.pnr_records.fare_currency IS '票價幣別';
COMMENT ON COLUMN public.pnr_records.ticket_issued_at IS '開票時間';
COMMENT ON COLUMN public.pnr_records.has_schedule_change IS '是否有航變';
COMMENT ON COLUMN public.pnr_records.queue_count IS '待處理 Queue 數量';

-- =====================================================
-- RLS 政策
-- =====================================================

-- 票價歷史
ALTER TABLE public.pnr_fare_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pnr_fare_history_select" ON public.pnr_fare_history;
CREATE POLICY "pnr_fare_history_select" ON public.pnr_fare_history
  FOR SELECT USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "pnr_fare_history_insert" ON public.pnr_fare_history;
CREATE POLICY "pnr_fare_history_insert" ON public.pnr_fare_history
  FOR INSERT WITH CHECK (
    workspace_id = get_current_user_workspace()
  );

DROP POLICY IF EXISTS "pnr_fare_history_update" ON public.pnr_fare_history;
CREATE POLICY "pnr_fare_history_update" ON public.pnr_fare_history
  FOR UPDATE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "pnr_fare_history_delete" ON public.pnr_fare_history;
CREATE POLICY "pnr_fare_history_delete" ON public.pnr_fare_history
  FOR DELETE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- 票價警報
ALTER TABLE public.pnr_fare_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pnr_fare_alerts_select" ON public.pnr_fare_alerts;
CREATE POLICY "pnr_fare_alerts_select" ON public.pnr_fare_alerts
  FOR SELECT USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "pnr_fare_alerts_insert" ON public.pnr_fare_alerts;
CREATE POLICY "pnr_fare_alerts_insert" ON public.pnr_fare_alerts
  FOR INSERT WITH CHECK (
    workspace_id = get_current_user_workspace()
  );

DROP POLICY IF EXISTS "pnr_fare_alerts_update" ON public.pnr_fare_alerts;
CREATE POLICY "pnr_fare_alerts_update" ON public.pnr_fare_alerts
  FOR UPDATE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "pnr_fare_alerts_delete" ON public.pnr_fare_alerts;
CREATE POLICY "pnr_fare_alerts_delete" ON public.pnr_fare_alerts
  FOR DELETE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- 航班狀態歷史
ALTER TABLE public.pnr_flight_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pnr_flight_status_history_select" ON public.pnr_flight_status_history;
CREATE POLICY "pnr_flight_status_history_select" ON public.pnr_flight_status_history
  FOR SELECT USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "pnr_flight_status_history_insert" ON public.pnr_flight_status_history;
CREATE POLICY "pnr_flight_status_history_insert" ON public.pnr_flight_status_history
  FOR INSERT WITH CHECK (
    workspace_id = get_current_user_workspace()
  );

DROP POLICY IF EXISTS "pnr_flight_status_history_update" ON public.pnr_flight_status_history;
CREATE POLICY "pnr_flight_status_history_update" ON public.pnr_flight_status_history
  FOR UPDATE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "pnr_flight_status_history_delete" ON public.pnr_flight_status_history;
CREATE POLICY "pnr_flight_status_history_delete" ON public.pnr_flight_status_history
  FOR DELETE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- 航班訂閱
ALTER TABLE public.flight_status_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flight_status_subscriptions_select" ON public.flight_status_subscriptions;
CREATE POLICY "flight_status_subscriptions_select" ON public.flight_status_subscriptions
  FOR SELECT USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "flight_status_subscriptions_insert" ON public.flight_status_subscriptions;
CREATE POLICY "flight_status_subscriptions_insert" ON public.flight_status_subscriptions
  FOR INSERT WITH CHECK (
    workspace_id = get_current_user_workspace()
  );

DROP POLICY IF EXISTS "flight_status_subscriptions_update" ON public.flight_status_subscriptions;
CREATE POLICY "flight_status_subscriptions_update" ON public.flight_status_subscriptions
  FOR UPDATE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "flight_status_subscriptions_delete" ON public.flight_status_subscriptions;
CREATE POLICY "flight_status_subscriptions_delete" ON public.flight_status_subscriptions
  FOR DELETE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- Queue 項目
ALTER TABLE public.pnr_queue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pnr_queue_items_select" ON public.pnr_queue_items;
CREATE POLICY "pnr_queue_items_select" ON public.pnr_queue_items
  FOR SELECT USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "pnr_queue_items_insert" ON public.pnr_queue_items;
CREATE POLICY "pnr_queue_items_insert" ON public.pnr_queue_items
  FOR INSERT WITH CHECK (
    workspace_id = get_current_user_workspace()
  );

DROP POLICY IF EXISTS "pnr_queue_items_update" ON public.pnr_queue_items;
CREATE POLICY "pnr_queue_items_update" ON public.pnr_queue_items
  FOR UPDATE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "pnr_queue_items_delete" ON public.pnr_queue_items;
CREATE POLICY "pnr_queue_items_delete" ON public.pnr_queue_items
  FOR DELETE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- 航變追蹤
ALTER TABLE public.pnr_schedule_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pnr_schedule_changes_select" ON public.pnr_schedule_changes;
CREATE POLICY "pnr_schedule_changes_select" ON public.pnr_schedule_changes
  FOR SELECT USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "pnr_schedule_changes_insert" ON public.pnr_schedule_changes;
CREATE POLICY "pnr_schedule_changes_insert" ON public.pnr_schedule_changes
  FOR INSERT WITH CHECK (
    workspace_id = get_current_user_workspace()
  );

DROP POLICY IF EXISTS "pnr_schedule_changes_update" ON public.pnr_schedule_changes;
CREATE POLICY "pnr_schedule_changes_update" ON public.pnr_schedule_changes
  FOR UPDATE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "pnr_schedule_changes_delete" ON public.pnr_schedule_changes;
CREATE POLICY "pnr_schedule_changes_delete" ON public.pnr_schedule_changes
  FOR DELETE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- AI 查詢
ALTER TABLE public.pnr_ai_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pnr_ai_queries_select" ON public.pnr_ai_queries;
CREATE POLICY "pnr_ai_queries_select" ON public.pnr_ai_queries
  FOR SELECT USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "pnr_ai_queries_insert" ON public.pnr_ai_queries;
CREATE POLICY "pnr_ai_queries_insert" ON public.pnr_ai_queries
  FOR INSERT WITH CHECK (
    workspace_id = get_current_user_workspace()
  );

DROP POLICY IF EXISTS "pnr_ai_queries_update" ON public.pnr_ai_queries;
CREATE POLICY "pnr_ai_queries_update" ON public.pnr_ai_queries
  FOR UPDATE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "pnr_ai_queries_delete" ON public.pnr_ai_queries;
CREATE POLICY "pnr_ai_queries_delete" ON public.pnr_ai_queries
  FOR DELETE USING (
    workspace_id = get_current_user_workspace()
    OR is_super_admin()
  );

-- =====================================================
-- 觸發器：自動更新 queue_count
-- =====================================================
CREATE OR REPLACE FUNCTION update_pnr_queue_count()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新對應 PNR 的 queue_count
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pnr_records
    SET queue_count = (
      SELECT COUNT(*) FROM public.pnr_queue_items
      WHERE pnr_id = NEW.pnr_id AND status = 'pending'
    )
    WHERE id = NEW.pnr_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.pnr_records
    SET queue_count = (
      SELECT COUNT(*) FROM public.pnr_queue_items
      WHERE pnr_id = NEW.pnr_id AND status = 'pending'
    )
    WHERE id = NEW.pnr_id;

    -- 如果 pnr_id 變更，也要更新舊的 PNR
    IF OLD.pnr_id IS DISTINCT FROM NEW.pnr_id THEN
      UPDATE public.pnr_records
      SET queue_count = (
        SELECT COUNT(*) FROM public.pnr_queue_items
        WHERE pnr_id = OLD.pnr_id AND status = 'pending'
      )
      WHERE id = OLD.pnr_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.pnr_records
    SET queue_count = (
      SELECT COUNT(*) FROM public.pnr_queue_items
      WHERE pnr_id = OLD.pnr_id AND status = 'pending'
    )
    WHERE id = OLD.pnr_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pnr_queue_count ON public.pnr_queue_items;
CREATE TRIGGER trigger_update_pnr_queue_count
AFTER INSERT OR UPDATE OR DELETE ON public.pnr_queue_items
FOR EACH ROW
EXECUTE FUNCTION update_pnr_queue_count();

-- =====================================================
-- 觸發器：自動更新 updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為所有新表格添加 updated_at 觸發器
DROP TRIGGER IF EXISTS trigger_pnr_fare_alerts_updated_at ON public.pnr_fare_alerts;
CREATE TRIGGER trigger_pnr_fare_alerts_updated_at
BEFORE UPDATE ON public.pnr_fare_alerts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_flight_status_subscriptions_updated_at ON public.flight_status_subscriptions;
CREATE TRIGGER trigger_flight_status_subscriptions_updated_at
BEFORE UPDATE ON public.flight_status_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_pnr_queue_items_updated_at ON public.pnr_queue_items;
CREATE TRIGGER trigger_pnr_queue_items_updated_at
BEFORE UPDATE ON public.pnr_queue_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_pnr_schedule_changes_updated_at ON public.pnr_schedule_changes;
CREATE TRIGGER trigger_pnr_schedule_changes_updated_at
BEFORE UPDATE ON public.pnr_schedule_changes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
