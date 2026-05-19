-- ════════════════════════════════════════════════════════════════════
-- supplier_pricing — 代辦商價目（含版本歷史）
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼建：
--   suppliers 表至今只是通訊錄（聯絡資訊 + 銀行帳號）、沒有「跟誰買多少
--   錢」的商業關係資料。
--
--   William 2026-05-20 對之前的「打字輸入代辦商名 + 自填成本」設計直接
--   說「好草率」。改為：代辦商從清單選、每個代辦商對各服務有自己的價、
--   開申辦單時自動帶當前價、報表能拉「某代辦商三個月辦多少張、平均成本」。
--
--   價會變、所以做版本：改價 = 插新 row + 把舊 row 的 superseded_at 標今天。
--   歷史申辦的 standard_price 是 snapshot 寫死、不會被現價污染報表。
--
-- 6 層 SOP：
--   L1 Feature Gate → visas
--   L2 Capability   → visas.pricing.{read,write}
--   L3 三維 Scope   → N/A（workspace 內全員可見）
--   L4 狀態守門     → unique partial index 守「同時只能一個 current」
--   L5 RLS          → setup_workspace_scoped_rls
--   L6 防呆 SSOT    → created_by/updated_by FK 指 employees(id)（紅線 B）
-- ════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE public.supplier_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 代辦商
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,

  -- 服務種類（一般 / 急件 各自一筆）
  application_service_type_id uuid NOT NULL
    REFERENCES public.application_service_types(id) ON DELETE RESTRICT,

  -- 標準價（給開申辦單時自動帶入）
  price numeric(20, 2) NOT NULL CHECK (price >= 0),

  -- 版本歷史
  -- effective_from：自哪一天起這個價有效
  -- superseded_at：被取代那天（NULL = 當前生效）
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  superseded_at date,

  -- 備註（例：「2026 Q2 漲價、原因 X」）
  notes text,

  -- 審計欄位
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  -- effective_from <= superseded_at（如果有 superseded）
  CONSTRAINT supplier_pricing_effective_range_check
    CHECK (superseded_at IS NULL OR superseded_at >= effective_from)
);

-- ══════ Index ══════

-- L4 業務鎖：同（supplier × service_type）同時只能有一筆 current
CREATE UNIQUE INDEX supplier_pricing_one_current_per_combo
  ON public.supplier_pricing (supplier_id, application_service_type_id)
  WHERE superseded_at IS NULL AND deleted_at IS NULL;

-- 查某代辦商所有當前價（價目表頁、開申辦單時 dropdown）
CREATE INDEX supplier_pricing_supplier_current_idx
  ON public.supplier_pricing (supplier_id, application_service_type_id)
  WHERE superseded_at IS NULL AND deleted_at IS NULL;

-- 報表：某服務歷年價格軌跡
CREATE INDEX supplier_pricing_service_history_idx
  ON public.supplier_pricing (application_service_type_id, effective_from DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX supplier_pricing_deleted_at_idx
  ON public.supplier_pricing (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ══════ RLS ══════

CALL public.setup_workspace_scoped_rls('supplier_pricing');

-- ══════ updated_at trigger ══════

CREATE TRIGGER supplier_pricing_updated_at
  BEFORE UPDATE ON public.supplier_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════ Comments ══════

COMMENT ON TABLE public.supplier_pricing IS
  '代辦商價目（含版本歷史）。改價 = 插新 row + 舊 row.superseded_at = 今天。歷史申辦的 standard_price snapshot 不受現價影響。';
COMMENT ON COLUMN public.supplier_pricing.superseded_at IS
  'NULL = 當前生效。被新版取代時填當天日期。同（supplier × service）同時只能一筆 NULL（partial unique index 守）。';
COMMENT ON COLUMN public.supplier_pricing.effective_from IS
  '此價自哪天起生效。報表撈某月成本時、用該月日期跟 effective_from / superseded_at 比對找出當時價。';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS supplier_pricing_updated_at ON public.supplier_pricing;
-- DROP TABLE IF EXISTS public.supplier_pricing CASCADE;
-- COMMIT;
