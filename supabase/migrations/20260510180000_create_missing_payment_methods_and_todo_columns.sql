-- ===========================================
-- 補建 production 缺的兩張表（smoke test 抓到的）
-- ===========================================
-- production aawrgygqgemgqssflfrx 缺：
--   - payment_methods（既有 migration 20260325380000 沒 apply 過）
--   - todo_columns（既有 migration 20260412100000 沒 apply 過）
-- 兩支 endpoint /api/finance/payment-methods 跟 /api/todo-columns 因此 500。
-- 此 migration 補建 + seed 漫途 default rows。
-- ===========================================

BEGIN;

-- ============ 1. payment_methods 表 ============
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('receipt', 'payment')),
  description text,
  placeholder text,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  debit_account_id uuid,
  credit_account_id uuid,
  fee_account_id uuid,
  fee_percent numeric(5,2) DEFAULT 0,
  fee_fixed numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (workspace_id, code, type)
);

CREATE INDEX IF NOT EXISTS idx_pm_workspace ON public.payment_methods(workspace_id);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pm_select ON public.payment_methods;
CREATE POLICY pm_select ON public.payment_methods FOR SELECT
  USING (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS pm_all ON public.payment_methods;
CREATE POLICY pm_all ON public.payment_methods FOR ALL TO authenticated
  USING (workspace_id = public.get_current_user_workspace())
  WITH CHECK (workspace_id = public.get_current_user_workspace());

-- seed 漫途 default（4 receipt + 3 payment）
INSERT INTO public.payment_methods (workspace_id, name, code, type, is_system, sort_order)
SELECT 'b2222222-2222-2222-2222-222222222222'::uuid, name, code, type, true, sort_order
FROM (VALUES
  ('現金', 'CASH_R', 'receipt', 1),
  ('支票', 'CHECK_R', 'receipt', 2),
  ('轉帳', 'TRANSFER_R', 'receipt', 3),
  ('刷卡', 'CARD_R', 'receipt', 4),
  ('現金', 'CASH_P', 'payment', 1),
  ('支票', 'CHECK_P', 'payment', 2),
  ('轉帳', 'TRANSFER_P', 'payment', 3)
) AS x(name, code, type, sort_order)
ON CONFLICT (workspace_id, code, type) DO NOTHING;

-- ============ 2. todo_columns 表 ============
CREATE TABLE IF NOT EXISTS public.todo_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT 'gray',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_todo_columns_workspace ON public.todo_columns(workspace_id);

ALTER TABLE public.todo_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tc_select ON public.todo_columns;
CREATE POLICY tc_select ON public.todo_columns FOR SELECT
  USING (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS tc_all ON public.todo_columns;
CREATE POLICY tc_all ON public.todo_columns FOR ALL TO authenticated
  USING (workspace_id = public.get_current_user_workspace())
  WITH CHECK (workspace_id = public.get_current_user_workspace());

-- seed 漫途 default 3 columns
INSERT INTO public.todo_columns (workspace_id, name, color, sort_order)
SELECT 'b2222222-2222-2222-2222-222222222222'::uuid, name, color, sort_order
FROM (VALUES ('待辦', 'gray', 1), ('進行中', 'blue', 2), ('完成', 'green', 3)) AS x(name, color, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.todo_columns
  WHERE workspace_id = 'b2222222-2222-2222-2222-222222222222'::uuid
);

COMMIT;

NOTIFY pgrst, 'reload schema';
