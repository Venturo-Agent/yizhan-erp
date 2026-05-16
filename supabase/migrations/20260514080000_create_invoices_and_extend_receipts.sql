-- ─────────────────────────────────────────────────────────────────────────────
-- 帳單系統 + 客戶自助付款 — Phase 1 DB schema
-- 2026-05-14 William 拍板
--
-- 完整 spec: Logan-Workspace/2026-05-14-帳單系統-客戶自助付款-CRM-spec.md
--
-- 設計：
--   1. 新表 invoices — 一張 order 可拆 N 張 invoice、各對應 order_member（團員）
--   2. receipts 加 invoice_id FK + bank_account_last5 + status 加 'pending_verify' / 'rejected'
--   3. trigger 自動算 invoice.paid_amount（只算 confirmed receipt、不算待確認）
--   4. RLS：authenticated 走 workspace_scoped、anon 限定帶對 token
--   5. token 14 天過期（William 拍板）
--
-- 紅線檢核：
--   ✅ 紅線 A：invoices ENABLE RLS、不 FORCE
--   ✅ 紅線 B：created_by FK → employees(id) ON DELETE SET NULL
--   ✅ 紅線 D：confirmed receipt 不准客戶 / anon 改、要走沖正
--
-- Rollback: 見末尾註解
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════════════════════════════════════════════════════════════
-- Step 1: 新表 invoices
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),

  -- 關聯
  -- 注意 type 對齊既有表：orders.id / customers.id 是 text、order_members.id 是 uuid
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES public.customers(id),
  member_id uuid REFERENCES public.order_members(id) ON DELETE SET NULL,

  -- 金額
  total_amount numeric(20, 2) NOT NULL CHECK (total_amount > 0),
  paid_amount numeric(20, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),

  -- 狀態 + 自助付款 token
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  public_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),

  -- 業務
  due_date date,
  notes text,

  -- 審計（紅線 B：FK → employees）
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON public.invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_member ON public.invoices(member_id);
CREATE INDEX IF NOT EXISTS idx_invoices_token ON public.invoices(public_token);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_token_expires ON public.invoices(token_expires_at);

COMMENT ON TABLE public.invoices IS '帳單表：一張 order 可拆 N 張 invoice、客戶用 public_token 自助付款';
COMMENT ON COLUMN public.invoices.public_token IS '客戶自助付款 link 的 token、UUID v4、14 天過期（William 2026-05-14 拍板）';
COMMENT ON COLUMN public.invoices.paid_amount IS 'trigger 自動算（只算 confirmed receipts、不算 pending_verify）';

-- ════════════════════════════════════════════════════════════
-- Step 2: receipts 加欄位 + 擴充 status enum
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bank_account_last5 text,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason text;

-- 後五碼格式驗證（5 碼純數字）
ALTER TABLE public.receipts
  DROP CONSTRAINT IF EXISTS receipts_bank_account_last5_format;
ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_bank_account_last5_format
  CHECK (bank_account_last5 IS NULL OR bank_account_last5 ~ '^\d{5}$');

CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON public.receipts(invoice_id);

COMMENT ON COLUMN public.receipts.invoice_id IS 'FK → invoices(id)、自助付款建的 receipt 必填、後台直接建可選';
COMMENT ON COLUMN public.receipts.bank_account_last5 IS '客戶填的匯款後五碼（5 碼數字）、會計對帳用';
COMMENT ON COLUMN public.receipts.verified_by IS '會計確認對帳的員工 id（FK → employees）';
COMMENT ON COLUMN public.receipts.rejected_reason IS '會計退回的原因、客戶端會看到';

-- 擴充 status enum：加 'pending_verify'（待確認）+ 'rejected'（已退回）
-- 既有值：'draft', 'confirmed', 'refunded'
DO $$
BEGIN
  -- 先刪舊 constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'receipts_status_check' AND conrelid = 'public.receipts'::regclass
  ) THEN
    ALTER TABLE public.receipts DROP CONSTRAINT receipts_status_check;
  END IF;
END $$;

-- 包含既有 production status 值 ('pending' 既有、保留不動）
-- 新加：pending_verify（客戶自助付款待確認）+ rejected（會計退回）
ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_status_check
  CHECK (status IN ('draft', 'pending', 'pending_verify', 'confirmed', 'refunded', 'rejected'));

-- ════════════════════════════════════════════════════════════
-- Step 3: Trigger 自動算 invoice.paid_amount
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.recalc_invoice_paid_amount()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_invoice_id uuid;
  v_new_paid numeric(20, 2);
  v_invoice_total numeric(20, 2);
  v_new_status text;
BEGIN
  -- 取得受影響的 invoice_id（INSERT/UPDATE 用 NEW、DELETE 用 OLD）
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
    -- UPDATE：如果 invoice_id 改了、舊的也要 recalc
    IF TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id THEN
      PERFORM public._recalc_one_invoice(OLD.invoice_id);
    END IF;
  END IF;

  IF v_invoice_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  PERFORM public._recalc_one_invoice(v_invoice_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public._recalc_one_invoice(p_invoice_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_new_paid numeric(20, 2);
  v_invoice_total numeric(20, 2);
  v_new_status text;
BEGIN
  -- 只算 confirmed 的、不算 pending_verify / rejected / refunded
  SELECT COALESCE(SUM(actual_amount), 0) INTO v_new_paid
  FROM public.receipts
  WHERE invoice_id = p_invoice_id AND status = 'confirmed';

  SELECT total_amount INTO v_invoice_total
  FROM public.invoices WHERE id = p_invoice_id;

  IF v_invoice_total IS NULL THEN RETURN; END IF;

  v_new_status := CASE
    WHEN v_new_paid >= v_invoice_total THEN 'paid'
    WHEN v_new_paid > 0 THEN 'partial'
    ELSE 'pending'
  END;

  UPDATE public.invoices
  SET paid_amount = v_new_paid,
      status = CASE WHEN status = 'cancelled' THEN status ELSE v_new_status END,
      updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_invoice_paid ON public.receipts;
CREATE TRIGGER trg_recalc_invoice_paid
  AFTER INSERT OR UPDATE OR DELETE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_paid_amount();

-- ════════════════════════════════════════════════════════════
-- Step 4: RLS for invoices
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
-- ⚠️ 不准 FORCE（紅線 A）

-- authenticated：標準 workspace_scoped + capability
DROP POLICY IF EXISTS "invoices_select_authenticated" ON public.invoices;
CREATE POLICY "invoices_select_authenticated" ON public.invoices
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "invoices_insert_authenticated" ON public.invoices;
CREATE POLICY "invoices_insert_authenticated" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "invoices_update_authenticated" ON public.invoices;
CREATE POLICY "invoices_update_authenticated" ON public.invoices
  FOR UPDATE TO authenticated
  USING (workspace_id = public.get_current_user_workspace())
  WITH CHECK (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "invoices_delete_authenticated" ON public.invoices;
CREATE POLICY "invoices_delete_authenticated" ON public.invoices
  FOR DELETE TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

-- anon：只能 SELECT 帶對 token 的單筆、未過期、非 cancelled
-- 走 header x-invoice-token（API route 設）
DROP POLICY IF EXISTS "invoices_anon_by_token" ON public.invoices;
CREATE POLICY "invoices_anon_by_token" ON public.invoices
  FOR SELECT TO anon
  USING (
    public_token::text = current_setting('request.headers.x-invoice-token', true)
    AND token_expires_at > now()
    AND status != 'cancelled'
  );

-- anon 不開 INSERT / UPDATE / DELETE（提交付款走 API route + admin client）

-- ════════════════════════════════════════════════════════════
-- Step 5: receipts anon policy（只能 SELECT 該 invoice 的 receipts）
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "receipts_anon_by_invoice_token" ON public.receipts;
CREATE POLICY "receipts_anon_by_invoice_token" ON public.receipts
  FOR SELECT TO anon
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE public_token::text = current_setting('request.headers.x-invoice-token', true)
        AND token_expires_at > now()
        AND status != 'cancelled'
    )
  );

-- ════════════════════════════════════════════════════════════
-- Step 6: 自動 update updated_at（既有 trigger pattern）
-- ════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS set_invoices_updated_at ON public.invoices;
CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ════════════════════════════════════════════════════════════
-- Step 7: 驗證
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_table_exists int;
  v_trigger_count int;
  v_policy_count int;
BEGIN
  SELECT count(*) INTO v_table_exists
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'invoices';
  IF v_table_exists = 0 THEN RAISE EXCEPTION 'invoices 表沒建出來'; END IF;

  SELECT count(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname IN ('trg_recalc_invoice_paid', 'set_invoices_updated_at');
  IF v_trigger_count < 2 THEN
    RAISE EXCEPTION 'trigger 數量不對、預期 2 個、實際 %', v_trigger_count;
  END IF;

  SELECT count(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'invoices';
  IF v_policy_count < 5 THEN
    RAISE EXCEPTION 'invoices RLS policy 數量不對、預期 5+、實際 %', v_policy_count;
  END IF;

  RAISE NOTICE '✓ invoices 表 + trigger + RLS 都建好';
END $$;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_recalc_invoice_paid ON public.receipts;
-- DROP TRIGGER IF EXISTS set_invoices_updated_at ON public.invoices;
-- DROP FUNCTION IF EXISTS public.recalc_invoice_paid_amount() CASCADE;
-- DROP FUNCTION IF EXISTS public._recalc_one_invoice(uuid) CASCADE;
-- ALTER TABLE public.receipts DROP COLUMN IF EXISTS invoice_id;
-- ALTER TABLE public.receipts DROP COLUMN IF EXISTS bank_account_last5;
-- ALTER TABLE public.receipts DROP COLUMN IF EXISTS verified_by;
-- ALTER TABLE public.receipts DROP COLUMN IF EXISTS verified_at;
-- ALTER TABLE public.receipts DROP COLUMN IF EXISTS rejected_reason;
-- ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_bank_account_last5_format;
-- ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_status_check;
-- ALTER TABLE public.receipts ADD CONSTRAINT receipts_status_check
--   CHECK (status IN ('draft', 'confirmed', 'refunded'));
-- DROP POLICY IF EXISTS "receipts_anon_by_invoice_token" ON public.receipts;
-- DROP TABLE IF EXISTS public.invoices CASCADE;
-- COMMIT;
