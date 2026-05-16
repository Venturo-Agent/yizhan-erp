-- ============================================================================
-- 20260502270000_add_missing_indexes_and_triggers.sql
--
-- 目的：ERP 全表 audit、補齊憲法 Section 2 要求的：
--   1) workspace_id index（每張業務表）
--   2) updated_at trigger 自動維護（每張業務表）
--   3) 缺 updated_at 欄的會被更新的業務表先加欄位
--
-- 憲法：docs/VENTURO_ERP_STANDARDS.md Section 2「每張業務表必有」
-- 凍結模組：channels / channel_members / messages / channel_groups 不動 schema
--   （Section 10 #16）。trigger 已存在於 channels/messages/channel_groups、
--   channel_members 跳過。
-- 例外：append-only 純 log 表（quote_confirmation_logs / line_messages）
--   不需要 updated_at、本 migration 不加。SCHEMA_PLAN 例外清單待補。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) 標準 set_updated_at() function
-- ----------------------------------------------------------------------------
-- 憲法用 set_updated_at（Section 2）。歷史上 ERP 用 update_updated_at_column，
-- 兩者語意一致。新 trigger 都掛 set_updated_at、舊的不動避免破壞既有行為。
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- ----------------------------------------------------------------------------
-- 2) 補 workspace_id index（6 張業務表）
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_flight_status_subscriptions_workspace_id
  ON public.flight_status_subscriptions(workspace_id);

CREATE INDEX IF NOT EXISTS idx_line_groups_workspace_id
  ON public.line_groups(workspace_id);

CREATE INDEX IF NOT EXISTS idx_profiles_workspace_id
  ON public.profiles(workspace_id);

CREATE INDEX IF NOT EXISTS idx_quote_confirmation_logs_workspace_id
  ON public.quote_confirmation_logs(workspace_id);

CREATE INDEX IF NOT EXISTS idx_rich_documents_workspace_id
  ON public.rich_documents(workspace_id);

CREATE INDEX IF NOT EXISTS idx_tour_meal_settings_workspace_id
  ON public.tour_meal_settings(workspace_id);

-- ----------------------------------------------------------------------------
-- 3) 加 updated_at 欄（5 張會被更新但缺欄位的業務表）
-- ----------------------------------------------------------------------------
ALTER TABLE public.accounting_period_closings
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.customer_service_conversations
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.request_response_items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.workspace_features
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ----------------------------------------------------------------------------
-- 4) 補 set_updated_at trigger（缺 trigger 的業務表）
--    凍結模組 channel_members 跳過。
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_ai_settings_updated_at ON public.ai_settings;
CREATE TRIGGER set_ai_settings_updated_at
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_background_tasks_updated_at ON public.background_tasks;
CREATE TRIGGER set_background_tasks_updated_at
  BEFORE UPDATE ON public.background_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER set_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_chart_of_accounts_updated_at ON public.chart_of_accounts;
CREATE TRIGGER set_chart_of_accounts_updated_at
  BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_checks_updated_at ON public.checks;
CREATE TRIGGER set_checks_updated_at
  BEFORE UPDATE ON public.checks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_contracts_updated_at ON public.contracts;
CREATE TRIGGER set_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_journal_vouchers_updated_at ON public.journal_vouchers;
CREATE TRIGGER set_journal_vouchers_updated_at
  BEFORE UPDATE ON public.journal_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_knowledge_base_updated_at ON public.knowledge_base;
CREATE TRIGGER set_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_line_conversations_updated_at ON public.line_conversations;
CREATE TRIGGER set_line_conversations_updated_at
  BEFORE UPDATE ON public.line_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_line_groups_updated_at ON public.line_groups;
CREATE TRIGGER set_line_groups_updated_at
  BEFORE UPDATE ON public.line_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_line_users_updated_at ON public.line_users;
CREATE TRIGGER set_line_users_updated_at
  BEFORE UPDATE ON public.line_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_notes_updated_at ON public.notes;
CREATE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER set_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_pnr_records_updated_at ON public.pnr_records;
CREATE TRIGGER set_pnr_records_updated_at
  BEFORE UPDATE ON public.pnr_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_rich_documents_updated_at ON public.rich_documents;
CREATE TRIGGER set_rich_documents_updated_at
  BEFORE UPDATE ON public.rich_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_todo_columns_updated_at ON public.todo_columns;
CREATE TRIGGER set_todo_columns_updated_at
  BEFORE UPDATE ON public.todo_columns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_travel_invoices_updated_at ON public.travel_invoices;
CREATE TRIGGER set_travel_invoices_updated_at
  BEFORE UPDATE ON public.travel_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_workspace_attendance_settings_updated_at ON public.workspace_attendance_settings;
CREATE TRIGGER set_workspace_attendance_settings_updated_at
  BEFORE UPDATE ON public.workspace_attendance_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_workspace_countries_updated_at ON public.workspace_countries;
CREATE TRIGGER set_workspace_countries_updated_at
  BEFORE UPDATE ON public.workspace_countries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_workspace_line_config_updated_at ON public.workspace_line_config;
CREATE TRIGGER set_workspace_line_config_updated_at
  BEFORE UPDATE ON public.workspace_line_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_workspace_meta_config_updated_at ON public.workspace_meta_config;
CREATE TRIGGER set_workspace_meta_config_updated_at
  BEFORE UPDATE ON public.workspace_meta_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_workspace_modules_updated_at ON public.workspace_modules;
CREATE TRIGGER set_workspace_modules_updated_at
  BEFORE UPDATE ON public.workspace_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_workspace_roles_updated_at ON public.workspace_roles;
CREATE TRIGGER set_workspace_roles_updated_at
  BEFORE UPDATE ON public.workspace_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_workspace_selector_fields_updated_at ON public.workspace_selector_fields;
CREATE TRIGGER set_workspace_selector_fields_updated_at
  BEFORE UPDATE ON public.workspace_selector_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5) 對 4 張剛加 updated_at 欄的表掛 trigger
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_accounting_period_closings_updated_at ON public.accounting_period_closings;
CREATE TRIGGER set_accounting_period_closings_updated_at
  BEFORE UPDATE ON public.accounting_period_closings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_customer_service_conversations_updated_at ON public.customer_service_conversations;
CREATE TRIGGER set_customer_service_conversations_updated_at
  BEFORE UPDATE ON public.customer_service_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_notifications_updated_at ON public.notifications;
CREATE TRIGGER set_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_request_response_items_updated_at ON public.request_response_items;
CREATE TRIGGER set_request_response_items_updated_at
  BEFORE UPDATE ON public.request_response_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_workspace_features_updated_at ON public.workspace_features;
CREATE TRIGGER set_workspace_features_updated_at
  BEFORE UPDATE ON public.workspace_features
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
