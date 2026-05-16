-- ─────────────────────────────────────────────────────────────────────────────
-- 帳單系統 Phase 2 — 批次 + 合付分配
-- 2026-05-15 William 拍板
--
-- 動機：
--   5/14 一人一單模型有個盲點 — 業務員不知道誰跟誰是一家人、開單只能一人一條
--   link 各自付。客戶想代付家人 / 朋友、只能切多條 link 跑多次表單。
--   新模型：一次「開帳單」事件 = 1 個 batch、共用 token + 多個 invoice items、
--   客戶端勾選 + 加總 + 一次付清。一筆 receipt 透過 allocations 多對多分到多個
--   invoice。
--
-- 結構：
--   - 新表 invoice_batches：批次本體、含 token + 過期 + 狀態
--   - 既有 invoices 加 batch_id（nullable、舊 5/14 那筆 = NULL、新建一律 = batch id）
--   - 新表 receipt_invoice_allocations：一筆 receipt 分到 N 個 invoice 各多少錢
--   - 既有 receipts 加 batch_id（nullable）
--   - trigger 改：receipts / allocations 任一動 → 重算 invoice.paid_amount → 連帶重算 batch.status
--
-- 紅線檢核：
--   ✅ A：invoice_batches ENABLE RLS、不 FORCE
--   ✅ B：created_by FK → employees(id) ON DELETE SET NULL
--   ✅ C：本表不需 admin client singleton、由 API layer 控
--   ✅ D：batch / invoice / receipt 完成後不開「重開」後門、要改走沖正
--
-- Rollback: 見末尾註解
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ════════════════════════════════════════════════════════════
-- Step 1: 新表 invoice_batches
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.invoice_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  -- orders.id 是 text（既有）、不是 uuid
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,

  -- 共用 token + 14 天過期（沿用 5/14 invoice 設計）
  public_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),

  -- pending: 全員未付 / partial: 至少 1 員有 confirmed receipt / paid: 全員付清
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
  notes text,

  -- 紅線 B：審計 FK → employees
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_batches_workspace ON public.invoice_batches(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoice_batches_order ON public.invoice_batches(order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_batches_token ON public.invoice_batches(public_token);
CREATE INDEX IF NOT EXISTS idx_invoice_batches_status ON public.invoice_batches(status);
CREATE INDEX IF NOT EXISTS idx_invoice_batches_expires ON public.invoice_batches(token_expires_at);

COMMENT ON TABLE public.invoice_batches IS '帳單批次：一次「開帳單」事件、含 N 個團員 invoice、共用 token + 14 天過期';
COMMENT ON COLUMN public.invoice_batches.public_token IS '客戶自助付款 link 用、UUID v4、14 天過期';
COMMENT ON COLUMN public.invoice_batches.status IS '由 trigger 從子 invoices status 自動算';

-- ════════════════════════════════════════════════════════════
-- Step 2: invoices 加 batch_id
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS batch_id uuid
    REFERENCES public.invoice_batches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invoices_batch ON public.invoices(batch_id);

COMMENT ON COLUMN public.invoices.batch_id IS '所屬批次 FK、新建一律有值；5/14 一人一單舊 model = NULL';

-- ════════════════════════════════════════════════════════════
-- Step 3: 新表 receipt_invoice_allocations
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.receipt_invoice_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  allocated_amount numeric(20, 2) NOT NULL CHECK (allocated_amount > 0),
  -- 冗餘存 workspace_id 用於 RLS（不用 JOIN）
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (receipt_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_alloc_receipt ON public.receipt_invoice_allocations(receipt_id);
CREATE INDEX IF NOT EXISTS idx_alloc_invoice ON public.receipt_invoice_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_alloc_workspace ON public.receipt_invoice_allocations(workspace_id);

COMMENT ON TABLE public.receipt_invoice_allocations IS '收款分配：一筆 receipt 分到 N 個 invoice（同 batch 多人合付場景）';

-- ════════════════════════════════════════════════════════════
-- Step 4: receipts 加 batch_id
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS batch_id uuid
    REFERENCES public.invoice_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_receipts_batch ON public.receipts(batch_id);

COMMENT ON COLUMN public.receipts.batch_id IS '透過 batch 多人合付才有值、單張 invoice 直接付 1:1 = NULL';

-- ════════════════════════════════════════════════════════════
-- Step 5: 改 trigger — invoice paid_amount 公式 = 直接 receipts.invoice_id + allocations
-- ════════════════════════════════════════════════════════════

-- 覆寫 5/14 版本：加上 allocations 來源 + 連帶重算 batch
CREATE OR REPLACE FUNCTION public._recalc_one_invoice(p_invoice_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_paid_direct numeric(20, 2);
  v_paid_alloc numeric(20, 2);
  v_total numeric(20, 2);
  v_batch_id uuid;
  v_new_status text;
BEGIN
  -- 來源 1：receipts.invoice_id 直接掛（5/14 舊 1:1 model）
  SELECT COALESCE(SUM(actual_amount), 0) INTO v_paid_direct
  FROM public.receipts
  WHERE invoice_id = p_invoice_id AND status = 'confirmed';

  -- 來源 2：allocations 多對多分配（新 N:N model）
  SELECT COALESCE(SUM(a.allocated_amount), 0) INTO v_paid_alloc
  FROM public.receipt_invoice_allocations a
  JOIN public.receipts r ON r.id = a.receipt_id
  WHERE a.invoice_id = p_invoice_id AND r.status = 'confirmed';

  SELECT total_amount, batch_id INTO v_total, v_batch_id
  FROM public.invoices WHERE id = p_invoice_id;
  IF v_total IS NULL THEN RETURN; END IF;

  v_new_status := CASE
    WHEN v_paid_direct + v_paid_alloc >= v_total THEN 'paid'
    WHEN v_paid_direct + v_paid_alloc > 0 THEN 'partial'
    ELSE 'pending'
  END;

  UPDATE public.invoices
  SET paid_amount = v_paid_direct + v_paid_alloc,
      status = CASE WHEN status = 'cancelled' THEN status ELSE v_new_status END,
      updated_at = now()
  WHERE id = p_invoice_id;

  -- 連帶重算 batch.status（新 model 才有值）
  IF v_batch_id IS NOT NULL THEN
    PERFORM public._recalc_one_batch(v_batch_id);
  END IF;
END;
$$;

-- 新 helper：從子 invoices 算 batch status
CREATE OR REPLACE FUNCTION public._recalc_one_batch(p_batch_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_total int;
  v_paid int;
  v_partial int;
  v_new_status text;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'paid'),
    count(*) FILTER (WHERE status = 'partial')
  INTO v_total, v_paid, v_partial
  FROM public.invoices
  WHERE batch_id = p_batch_id AND status != 'cancelled';

  IF v_total = 0 THEN RETURN; END IF;

  v_new_status := CASE
    WHEN v_paid = v_total THEN 'paid'
    WHEN v_paid + v_partial > 0 THEN 'partial'
    ELSE 'pending'
  END;

  UPDATE public.invoice_batches
  SET status = CASE WHEN status = 'cancelled' THEN status ELSE v_new_status END,
      updated_at = now()
  WHERE id = p_batch_id;
END;
$$;

-- 覆寫 5/14 receipts trigger：處理 invoice_id 直接 + allocations 透過
CREATE OR REPLACE FUNCTION public.recalc_invoice_paid_amount()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_invoice_id uuid;
  v_receipt_id uuid;
BEGIN
  v_receipt_id := COALESCE(NEW.id, OLD.id);

  -- 處理 invoice_id 直接掛（舊 1:1）
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id) THEN
    IF OLD.invoice_id IS NOT NULL THEN
      PERFORM public._recalc_one_invoice(OLD.invoice_id);
    END IF;
  END IF;
  IF TG_OP != 'DELETE' AND NEW.invoice_id IS NOT NULL THEN
    PERFORM public._recalc_one_invoice(NEW.invoice_id);
  END IF;

  -- 處理 allocations 透過（新 N:N）
  FOR v_invoice_id IN
    SELECT DISTINCT invoice_id FROM public.receipt_invoice_allocations
    WHERE receipt_id = v_receipt_id
  LOOP
    PERFORM public._recalc_one_invoice(v_invoice_id);
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_invoice_paid ON public.receipts;
CREATE TRIGGER trg_recalc_invoice_paid
  AFTER INSERT OR UPDATE OR DELETE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_paid_amount();

-- allocations 自己的 trigger（INSERT 時 receipt 還 pending_verify、不會觸發累加；
-- 但 receipt status 改 confirmed 時 receipts trigger 會掃 allocations 重算、所以 OK。
-- 不過 allocation 自己被改 / 刪、要重算對應 invoice）
CREATE OR REPLACE FUNCTION public.recalc_allocations_impact()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id) THEN
    IF OLD.invoice_id IS NOT NULL THEN
      PERFORM public._recalc_one_invoice(OLD.invoice_id);
    END IF;
  END IF;
  IF TG_OP != 'DELETE' AND NEW.invoice_id IS NOT NULL THEN
    PERFORM public._recalc_one_invoice(NEW.invoice_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_allocations ON public.receipt_invoice_allocations;
CREATE TRIGGER trg_recalc_allocations
  AFTER INSERT OR UPDATE OR DELETE ON public.receipt_invoice_allocations
  FOR EACH ROW EXECUTE FUNCTION public.recalc_allocations_impact();

-- updated_at trigger
DROP TRIGGER IF EXISTS set_invoice_batches_updated_at ON public.invoice_batches;
CREATE TRIGGER set_invoice_batches_updated_at
  BEFORE UPDATE ON public.invoice_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ════════════════════════════════════════════════════════════
-- Step 6: RLS for invoice_batches
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.invoice_batches ENABLE ROW LEVEL SECURITY;
-- 紅線 A：不 FORCE（本表雖不影響登入、為一致性 + 萬一 fallback 也保留 service_role bypass）

DROP POLICY IF EXISTS "invoice_batches_select_authenticated" ON public.invoice_batches;
CREATE POLICY "invoice_batches_select_authenticated" ON public.invoice_batches
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "invoice_batches_insert_authenticated" ON public.invoice_batches;
CREATE POLICY "invoice_batches_insert_authenticated" ON public.invoice_batches
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "invoice_batches_update_authenticated" ON public.invoice_batches;
CREATE POLICY "invoice_batches_update_authenticated" ON public.invoice_batches
  FOR UPDATE TO authenticated
  USING (workspace_id = public.get_current_user_workspace())
  WITH CHECK (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "invoice_batches_delete_authenticated" ON public.invoice_batches;
CREATE POLICY "invoice_batches_delete_authenticated" ON public.invoice_batches
  FOR DELETE TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

-- anon：只能 SELECT 帶對 token 的 batch（同 5/14 invoices_anon_by_token pattern）
DROP POLICY IF EXISTS "invoice_batches_anon_by_token" ON public.invoice_batches;
CREATE POLICY "invoice_batches_anon_by_token" ON public.invoice_batches
  FOR SELECT TO anon
  USING (
    public_token::text = current_setting('request.headers.x-invoice-token', true)
    AND token_expires_at > now()
    AND status != 'cancelled'
  );

-- ════════════════════════════════════════════════════════════
-- Step 7: RLS for receipt_invoice_allocations
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.receipt_invoice_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alloc_select_authenticated" ON public.receipt_invoice_allocations;
CREATE POLICY "alloc_select_authenticated" ON public.receipt_invoice_allocations
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "alloc_insert_authenticated" ON public.receipt_invoice_allocations;
CREATE POLICY "alloc_insert_authenticated" ON public.receipt_invoice_allocations
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = public.get_current_user_workspace());

DROP POLICY IF EXISTS "alloc_delete_authenticated" ON public.receipt_invoice_allocations;
CREATE POLICY "alloc_delete_authenticated" ON public.receipt_invoice_allocations
  FOR DELETE TO authenticated
  USING (workspace_id = public.get_current_user_workspace());

-- anon 不開直接 SELECT（客戶端走 API route + admin client、看自己 batch 下的 invoices 狀態就夠）

-- ════════════════════════════════════════════════════════════
-- Step 8: 擴充 invoices anon RLS — 同 batch 內互看
-- ════════════════════════════════════════════════════════════

-- 客戶帶 batch token、要能看到該 batch 下所有 invoices（不只自己）
-- 既有 invoices_anon_by_token 是 invoice 自己的 public_token、新流程不夠用
-- 加一條：透過 batch token 看 batch 下全部 invoices
DROP POLICY IF EXISTS "invoices_anon_by_batch_token" ON public.invoices;
CREATE POLICY "invoices_anon_by_batch_token" ON public.invoices
  FOR SELECT TO anon
  USING (
    batch_id IN (
      SELECT id FROM public.invoice_batches
      WHERE public_token::text = current_setting('request.headers.x-invoice-token', true)
        AND token_expires_at > now()
        AND status != 'cancelled'
    )
  );

-- 同樣加 receipts 的 anon by batch token（客戶看歷次付款進度）
DROP POLICY IF EXISTS "receipts_anon_by_batch_token" ON public.receipts;
CREATE POLICY "receipts_anon_by_batch_token" ON public.receipts
  FOR SELECT TO anon
  USING (
    batch_id IN (
      SELECT id FROM public.invoice_batches
      WHERE public_token::text = current_setting('request.headers.x-invoice-token', true)
        AND token_expires_at > now()
        AND status != 'cancelled'
    )
  );

-- ════════════════════════════════════════════════════════════
-- Step 8.5: 放寬 receipts.bank_account_last5 constraint
-- ════════════════════════════════════════════════════════════
-- 原本只接 5 碼數字（5/14 寫死「匯款後五碼」場景）
-- 新流程接多種收款方式：匯款後五碼 / 信用卡末四碼 / 其他、要彈性
-- 改成 4-20 碼數字、欄位名暫不 rename（之後 v2 再評估）
ALTER TABLE public.receipts
  DROP CONSTRAINT IF EXISTS receipts_bank_account_last5_format;
ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_bank_account_last5_format
  CHECK (bank_account_last5 IS NULL OR bank_account_last5 ~ '^\d{4,20}$');

-- ════════════════════════════════════════════════════════════
-- Step 9: 驗證
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_table_count int;
  v_trigger_count int;
  v_policy_count int;
BEGIN
  SELECT count(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('invoice_batches', 'receipt_invoice_allocations');
  IF v_table_count != 2 THEN RAISE EXCEPTION '新表沒建齊、預期 2、實際 %', v_table_count; END IF;

  SELECT count(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname IN (
    'trg_recalc_invoice_paid',
    'trg_recalc_allocations',
    'set_invoice_batches_updated_at'
  );
  IF v_trigger_count < 3 THEN
    RAISE EXCEPTION 'trigger 數量不對、預期 3、實際 %', v_trigger_count;
  END IF;

  SELECT count(*) INTO v_policy_count
  FROM pg_policies WHERE tablename = 'invoice_batches';
  IF v_policy_count < 5 THEN
    RAISE EXCEPTION 'invoice_batches RLS policy 不對、預期 5、實際 %', v_policy_count;
  END IF;

  RAISE NOTICE '✓ invoice_batches + allocations + trigger + RLS 建好';
END $$;

COMMIT;

-- ════ Rollback（萬一爆炸、複製貼上跑）════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_recalc_allocations ON public.receipt_invoice_allocations;
-- DROP TRIGGER IF EXISTS set_invoice_batches_updated_at ON public.invoice_batches;
-- DROP FUNCTION IF EXISTS public.recalc_allocations_impact() CASCADE;
-- DROP FUNCTION IF EXISTS public._recalc_one_batch(uuid) CASCADE;
-- DROP POLICY IF EXISTS "invoices_anon_by_batch_token" ON public.invoices;
-- DROP POLICY IF EXISTS "receipts_anon_by_batch_token" ON public.receipts;
-- ALTER TABLE public.receipts DROP COLUMN IF EXISTS batch_id;
-- ALTER TABLE public.invoices DROP COLUMN IF EXISTS batch_id;
-- DROP TABLE IF EXISTS public.receipt_invoice_allocations CASCADE;
-- DROP TABLE IF EXISTS public.invoice_batches CASCADE;
-- -- 還原 _recalc_one_invoice / recalc_invoice_paid_amount 到 5/14 版本（從 20260514080000 migration 抓）
-- COMMIT;
