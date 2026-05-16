-- =============================================
-- 統一通知系統
-- 所有模組共用，支援站內 + LINE + Email
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- 收發件人
  recipient_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES employees(id) ON DELETE SET NULL,

  -- 通知分類
  module VARCHAR(50) NOT NULL DEFAULT 'system',
  -- hr, finance, tour, system, announcement
  type VARCHAR(20) NOT NULL DEFAULT 'info',
  -- info: 一般通知 | action: 需操作（審核） | alert: 警告

  -- 通知內容
  title VARCHAR(200) NOT NULL,
  message TEXT,

  -- 跳轉與操作
  action_url VARCHAR(500),
  action_data JSONB DEFAULT '{}',
  -- action_data 範例：
  -- { "request_type": "leave", "request_id": "uuid", "action": "approve" }

  -- 狀態
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- 頻道追蹤
  channels_sent JSONB DEFAULT '["web"]',
  -- ["web", "line", "email"]

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_workspace ON notifications(workspace_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_module ON notifications(module);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 員工只能看自己的通知
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- 員工可以標記自己的通知為已讀
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Service role 可以新增（API 發通知用）
CREATE POLICY "notifications_insert_service" ON notifications
  FOR INSERT WITH CHECK (true);

-- Service role 可以刪除
CREATE POLICY "notifications_delete_service" ON notifications
  FOR DELETE USING (true);

COMMENT ON TABLE notifications IS '統一通知系統 — 所有模組共用';
COMMENT ON COLUMN notifications.module IS '來源模組：hr, finance, tour, system, announcement';
COMMENT ON COLUMN notifications.type IS '通知類型：info（一般）, action（需操作）, alert（警告）';
COMMENT ON COLUMN notifications.action_url IS '點擊通知後跳轉的頁面路徑';
COMMENT ON COLUMN notifications.action_data IS '操作相關資料（審核用）';

-- =============================================
-- 租戶通知設定
-- =============================================

CREATE TABLE IF NOT EXISTS workspace_notification_settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,

  -- 頻道開關
  enable_line BOOLEAN NOT NULL DEFAULT true,
  enable_email BOOLEAN NOT NULL DEFAULT false,

  -- 通知觸發設定
  notify_leave_request BOOLEAN NOT NULL DEFAULT true,
  notify_overtime_request BOOLEAN NOT NULL DEFAULT true,
  notify_missed_clock_request BOOLEAN NOT NULL DEFAULT true,
  notify_approval_result BOOLEAN NOT NULL DEFAULT true,
  notify_payroll_confirmed BOOLEAN NOT NULL DEFAULT true,
  notify_tour_status_change BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE workspace_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_settings_select" ON workspace_notification_settings
  FOR SELECT USING (workspace_id IN (
    SELECT workspace_id FROM employees WHERE id = auth.uid()
  ));

CREATE POLICY "notification_settings_all" ON workspace_notification_settings
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE workspace_notification_settings IS '租戶通知設定';
