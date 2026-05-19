-- ════════════════════════════════════════════════════════════════════
-- customer_document_applications + history — 申辦事件 + 狀態軌跡
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼建：
--   證件抽屜 (customer_documents) 知道客人手上有什麼、但不知道「這張怎麼來的」。
--   申辦事件記錄一次完整代辦流程：送件 → 取件 → 歸還客戶 / 退件。
--
--   一張證件 (customer_documents) 可以有 0 到 N 個 applications：
--     0 個：客人自己辦的 / 別家辦的、我們只是登錄
--     1 個：典型情境、我們代辦一次拿到
--     N 個：重辦過（前一次退件 + 重送 / 過期重申）
--
--   申辦完成時、status 跳 collected → 把號碼 / 效期寫回 customer_documents、
--   舊版同類型自動標 superseded（由 RPC 處理、不在 trigger）。
--
-- 紅線 D（不准作弊後門）+ William 2026-05-20 拍板 L4 鎖：
--   取件之後（status=collected）、申辦的重要欄位鎖死（vendor / 價 / 日期 /
--   service_type / customer_document_id 都不能改）。要改 → 走「作廢這筆 +
--   重新登記一筆」（status = cancelled、再新增）。
--
--   允許的後續編輯：
--     collected → returned / cancelled（狀態進度、加 returned_to_customer_at）
--     notes、deleted_at、audit fields 任何時候都可改
--     終止狀態 (returned / rejected / cancelled) 也鎖大部分欄位
--
-- 6 層 SOP：
--   L1 Feature Gate → visas
--   L2 Capability   → visas.applications.{read,write}
--   L3 三維 Scope   → 透過 customer_document → customer 繼承
--   L4 狀態守門     → status check constraint + lock_collected_application trigger
--   L5 RLS          → setup_inherited_rls（via customer_documents → customers）
--   L6 防呆 SSOT    → created_by/updated_by FK 指 employees(id)（紅線 B）
-- ════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE public.customer_document_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 申辦哪張證件
  customer_document_id uuid NOT NULL
    REFERENCES public.customer_documents(id) ON DELETE CASCADE,

  -- 哪種服務（一般 / 急件 在此區分）
  application_service_type_id uuid NOT NULL
    REFERENCES public.application_service_types(id) ON DELETE RESTRICT,

  -- 哪個代辦商（可空、client 自己辦時不填）
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,

  -- ─── 記帳追溯（這次申辦因為哪個團 / 訂單 / 成員觸發）────
  tour_id uuid REFERENCES public.tours(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_member_id uuid REFERENCES public.order_members(id) ON DELETE SET NULL,

  -- ─── 金額（snapshot 不會被現價污染）────
  -- standard_price：開單時帶入的價（從 supplier_pricing snapshot）
  -- actual_price：實際付給代辦商
  -- fee_charged：我們向客戶收的
  standard_price numeric(20, 2) CHECK (standard_price IS NULL OR standard_price >= 0),
  actual_price numeric(20, 2) CHECK (actual_price IS NULL OR actual_price >= 0),
  fee_charged numeric(20, 2) CHECK (fee_charged IS NULL OR fee_charged >= 0),

  -- ─── 狀態 pipeline ────
  -- pending：剛開單、還沒送
  -- submitted：送件中
  -- collected：拿回手上（從代辦商處）
  -- returned：歸還給客戶
  -- rejected：退件（沒拿到）
  -- cancelled：作廢（紅線 D 的「重新登記」用）
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'collected', 'returned', 'rejected', 'cancelled')),

  -- 四個關鍵日期
  submitted_at timestamptz,
  collected_at timestamptz,
  returned_to_customer_at timestamptz,
  rejected_at timestamptz,

  -- 紅線 D：若此筆 cancelled、指向取代他的新申辦
  -- 形成「沖正配對」：原 row 標 cancelled + 新 row 指回原 row.id
  reverses_application_id uuid REFERENCES public.customer_document_applications(id) ON DELETE SET NULL,

  -- 自由備註（即使 L4 鎖死、notes 仍可改）
  notes text,

  -- 審計欄位
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ════════════════════════════════════════════════════════════════════
-- customer_document_application_history — 狀態軌跡
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE public.customer_document_application_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  application_id uuid NOT NULL
    REFERENCES public.customer_document_applications(id) ON DELETE CASCADE,

  from_status text,
  to_status text NOT NULL,

  -- 誰改的
  changed_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),

  -- 為什麼改（cancelled 必填、其他選填）
  reason text
);

-- ══════ Index ══════

-- 主流查詢：列所有「辦理中」的申辦（給代辦進度頁、依狀態 + 送件日排序）
CREATE INDEX customer_document_applications_active_status_idx
  ON public.customer_document_applications (workspace_id, status, submitted_at DESC NULLS LAST)
  WHERE deleted_at IS NULL AND status IN ('pending', 'submitted', 'collected');

-- 某證件的申辦歷史
CREATE INDEX customer_document_applications_document_idx
  ON public.customer_document_applications (customer_document_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 代辦商業績報表（某代辦商在某時間範圍辦了多少）
CREATE INDEX customer_document_applications_supplier_submitted_idx
  ON public.customer_document_applications (workspace_id, supplier_id, submitted_at)
  WHERE deleted_at IS NULL AND supplier_id IS NOT NULL;

-- 跟訂單關聯（從訂單頁反查申辦）
CREATE INDEX customer_document_applications_order_idx
  ON public.customer_document_applications (order_id)
  WHERE deleted_at IS NULL AND order_id IS NOT NULL;

CREATE INDEX customer_document_applications_deleted_at_idx
  ON public.customer_document_applications (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 軌跡 index
CREATE INDEX customer_document_application_history_app_idx
  ON public.customer_document_application_history (application_id, changed_at DESC);

CREATE INDEX customer_document_application_history_workspace_idx
  ON public.customer_document_application_history (workspace_id, changed_at DESC);

-- ══════ RLS（兩張表都透過 customer_documents → customers 繼承）══════

CALL public.setup_inherited_rls(
  'customer_document_applications',
  'customer_documents',
  'customer_document_id'
);

CALL public.setup_inherited_rls(
  'customer_document_application_history',
  'customer_document_applications',
  'application_id'
);

-- ══════ updated_at trigger ══════

CREATE TRIGGER customer_document_applications_updated_at
  BEFORE UPDATE ON public.customer_document_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════ L4 狀態鎖 trigger ══════
-- 取件 (collected) 之後、大部分欄位鎖死。要改 → 走「作廢 + 重新登記」。
-- 對應紅線 D：不准開作弊後門。

CREATE OR REPLACE FUNCTION public.lock_collected_application()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_immutable_changed boolean := false;
BEGIN
  -- pending / submitted：自由編輯、不鎖
  IF OLD.status IN ('pending', 'submitted') THEN
    RETURN NEW;
  END IF;

  -- collected / returned / rejected / cancelled：受保護狀態
  -- 比對所有 immutable 欄位、有任何一個變了就 reject
  IF NEW.customer_document_id IS DISTINCT FROM OLD.customer_document_id THEN
    v_immutable_changed := true;
  ELSIF NEW.application_service_type_id IS DISTINCT FROM OLD.application_service_type_id THEN
    v_immutable_changed := true;
  ELSIF NEW.supplier_id IS DISTINCT FROM OLD.supplier_id THEN
    v_immutable_changed := true;
  ELSIF NEW.tour_id IS DISTINCT FROM OLD.tour_id THEN
    v_immutable_changed := true;
  ELSIF NEW.order_id IS DISTINCT FROM OLD.order_id THEN
    v_immutable_changed := true;
  ELSIF NEW.order_member_id IS DISTINCT FROM OLD.order_member_id THEN
    v_immutable_changed := true;
  ELSIF NEW.standard_price IS DISTINCT FROM OLD.standard_price THEN
    v_immutable_changed := true;
  ELSIF NEW.actual_price IS DISTINCT FROM OLD.actual_price THEN
    v_immutable_changed := true;
  ELSIF NEW.fee_charged IS DISTINCT FROM OLD.fee_charged THEN
    v_immutable_changed := true;
  ELSIF NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    v_immutable_changed := true;
  ELSIF NEW.collected_at IS DISTINCT FROM OLD.collected_at THEN
    v_immutable_changed := true;
  ELSIF NEW.rejected_at IS DISTINCT FROM OLD.rejected_at THEN
    v_immutable_changed := true;
  END IF;

  IF v_immutable_changed THEN
    RAISE EXCEPTION
      '已取件後的申辦不能改重要欄位（status=%）。請走「作廢這筆 + 重新登記一筆」模式（紅線 D）。',
      OLD.status
    USING ERRCODE = 'check_violation';
  END IF;

  -- 狀態進度規則：
  --   collected → returned / cancelled 可
  --   returned / rejected / cancelled → 不可再變動 status
  IF OLD.status = 'collected' AND NEW.status NOT IN ('collected', 'returned', 'cancelled') THEN
    RAISE EXCEPTION '已取件的申辦只能歸還或作廢、不能倒退到 %', NEW.status;
  ELSIF OLD.status IN ('returned', 'rejected', 'cancelled')
        AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION '已結束的申辦不能改 status（OLD=%）。請走作廢 + 重新登記。', OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER lock_collected_application_trigger
  BEFORE UPDATE ON public.customer_document_applications
  FOR EACH ROW EXECUTE FUNCTION public.lock_collected_application();

-- ══════ 狀態軌跡 trigger（status 變動時自動寫 history）══════

CREATE OR REPLACE FUNCTION public.record_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.customer_document_application_history
      (workspace_id, application_id, from_status, to_status, changed_by)
    VALUES
      (NEW.workspace_id, NEW.id, NULL, NEW.status, NEW.created_by);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.customer_document_application_history
      (workspace_id, application_id, from_status, to_status, changed_by)
    VALUES
      (NEW.workspace_id, NEW.id, OLD.status, NEW.status, NEW.updated_by);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER record_application_status_change_trigger
  AFTER INSERT OR UPDATE ON public.customer_document_applications
  FOR EACH ROW EXECUTE FUNCTION public.record_application_status_change();

-- ══════ Comments ══════

COMMENT ON TABLE public.customer_document_applications IS
  '證件代辦申辦事件。一張證件 0..N 個申辦（客人自己辦的 0 個、重辦過 N 個）。collected 之後鎖死、要改走作廢 + 重新登記（紅線 D）。';
COMMENT ON COLUMN public.customer_document_applications.reverses_application_id IS
  '紅線 D 沖正配對：原 row 標 cancelled + 新 row.reverses_application_id = 原 row.id。';
COMMENT ON COLUMN public.customer_document_applications.standard_price IS
  '開單時從 supplier_pricing 帶入的標準價 snapshot。價變了不影響此筆。';
COMMENT ON FUNCTION public.lock_collected_application IS
  '紅線 D L4 lock：collected 之後重要欄位不可改、只能加 notes 或改 status (collected → returned/cancelled)';

COMMENT ON TABLE public.customer_document_application_history IS
  '申辦狀態軌跡。trigger 自動寫、不需手動 INSERT。給「這筆何時送出、誰送的、為何被退」追蹤。';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS lock_collected_application_trigger ON public.customer_document_applications;
-- DROP TRIGGER IF EXISTS record_application_status_change_trigger ON public.customer_document_applications;
-- DROP TRIGGER IF EXISTS customer_document_applications_updated_at ON public.customer_document_applications;
-- DROP FUNCTION IF EXISTS public.lock_collected_application();
-- DROP FUNCTION IF EXISTS public.record_application_status_change();
-- DROP TABLE IF EXISTS public.customer_document_application_history CASCADE;
-- DROP TABLE IF EXISTS public.customer_document_applications CASCADE;
-- COMMIT;
