-- ════════════════════════════════════════════════════════════════════
-- application_service_types — 代辦服務種類字典
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼建：
--   開申辦單時、員工要選「我要代辦的服務」。同一張證件（例：台胞證）
--   可能對應兩種服務（一般 / 急件），價格不同。
--
--   William 2026-05-20 拍板：急件 / 一般直接拆成兩個服務種類條目，
--   不要在 schema 塞 is_urgent flag + 加成欄位這種複雜規則。每個條目自己
--   一個價。代辦商價目 (supplier_pricing) 也是按服務種類掛、邏輯一致。
--
--   服務 → 證件：透過 document_type_id 串。客戶證件抽屜 (customer_documents)
--   永遠看到的是 document_types 那層、不混入「急件」這個服務維度。
--
-- 6 層 SOP：
--   L1 Feature Gate → visas
--   L2 Capability   → visas.service_types.{read,write}
--   L3 三維 Scope   → N/A（workspace 內全員字典）
--   L4 狀態守門     → N/A
--   L5 RLS          → setup_workspace_scoped_rls
--   L6 防呆 SSOT    → created_by/updated_by FK 指 employees(id)（紅線 B）
-- ════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE public.application_service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 對應的證件種類（一個證件可有 N 個服務、例：一般/急件）
  document_type_id uuid NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,

  -- 字典 key（租戶內唯一）
  code text NOT NULL,

  -- 顯示名稱（會帶服務維度、例：「台胞證 一般」「台胞證 急件」）
  label text NOT NULL,

  -- 是否為急件版（純標記、給 UI 高亮 + 報表分組用、不參與業務邏輯判斷）
  is_urgent boolean NOT NULL DEFAULT false,

  -- 預估工作天（給 UI 顯示「約 X 天」、選填）
  estimated_business_days integer,

  -- UI 排序
  sort_order integer NOT NULL DEFAULT 0,

  is_active boolean NOT NULL DEFAULT true,

  -- 審計欄位
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT application_service_types_workspace_code_unique UNIQUE (workspace_id, code)
);

-- ══════ Index ══════

CREATE INDEX application_service_types_workspace_active_idx
  ON public.application_service_types (workspace_id, is_active, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX application_service_types_document_type_idx
  ON public.application_service_types (document_type_id)
  WHERE deleted_at IS NULL;

CREATE INDEX application_service_types_deleted_at_idx
  ON public.application_service_types (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ══════ RLS ══════

CALL public.setup_workspace_scoped_rls('application_service_types');

-- ══════ updated_at trigger ══════

CREATE TRIGGER application_service_types_updated_at
  BEFORE UPDATE ON public.application_service_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════ Comments ══════

COMMENT ON TABLE public.application_service_types IS
  '代辦服務種類字典。每筆 = 一個可代辦項目（含一般 / 急件區分）、掛到 document_types。代辦商價目 (supplier_pricing) 依本表的 id 掛價。';
COMMENT ON COLUMN public.application_service_types.is_urgent IS
  '純標記、不影響業務邏輯。急件 / 一般是分開的 row、各自獨立 priced。';
COMMENT ON COLUMN public.application_service_types.estimated_business_days IS
  'UI 提示用、可空。例：台胞證一般 5 天、急件 2 天';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS application_service_types_updated_at ON public.application_service_types;
-- DROP TABLE IF EXISTS public.application_service_types CASCADE;
-- COMMIT;
