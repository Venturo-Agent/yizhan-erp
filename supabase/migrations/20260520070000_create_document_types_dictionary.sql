-- ════════════════════════════════════════════════════════════════════
-- document_types — 客戶證件種類字典
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼建：
--   2026-05-07 砍 visas 表後、簽證管理整個從前端消失。William 2026-05-20
--   拍板重啟、但這次做成「客戶證件抽屜」+「申辦事件」+「代辦商價目」三層
--   設計。本表是抽屜的分類字典。
--
--   一個客戶可能持有多本不同證件（台灣護照 + 美國護照 + 美簽 + 台胞證…），
--   每張掛在 customer_documents、用 document_type_id 指回本表。
--
--   多本同類型也可能存在（台灣護照舊本失效、新本生效）— 由
--   customer_documents.is_primary 控制當下哪本是「現用」。
--
-- 跟 application_service_types 的差異：
--   document_types  = 客戶手上拿到的證件種類（語意：物件）
--                     例：護照 台灣、護照 美國、台胞證、美簽、日簽
--   application_service_types = 我們提供的代辦服務種類（語意：作業）
--                     例：台胞證 一般 / 急件、美簽 一般 / 急件
--   每個 service 指向一個 document、急件 / 一般共用同一個 document 種類。
--
-- 6 層 SOP：
--   L1 Feature Gate → visas（seed migration 開）
--   L2 Capability   → visas.document_types.{read,write}（seed migration 給）
--   L3 三維 Scope   → N/A（workspace 內全員字典）
--   L4 狀態守門     → N/A（純字典）
--   L5 RLS          → setup_workspace_scoped_rls
--   L6 防呆 SSOT    → created_by/updated_by FK 指 employees(id)（紅線 B）
-- ════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 字典 key（租戶內唯一、給 code reference）
  code text NOT NULL,

  -- 顯示名稱（中文業務語言）
  label text NOT NULL,

  -- 分組標籤（UI 群組用、選填）
  -- 例：「護照」「港澳台」「美洲簽證」「亞洲簽證」「歐洲簽證」
  group_label text,

  -- UI 排序（小在前）
  sort_order integer NOT NULL DEFAULT 0,

  is_active boolean NOT NULL DEFAULT true,

  -- 審計欄位（紅線 B：FK 指 employees(id)）
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  -- 同租戶內 code 唯一
  CONSTRAINT document_types_workspace_code_unique UNIQUE (workspace_id, code)
);

-- ══════ Index ══════

CREATE INDEX document_types_workspace_active_sort_idx
  ON public.document_types (workspace_id, is_active, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX document_types_deleted_at_idx
  ON public.document_types (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ══════ RLS（走 procedure、不散刻、紅線 #5）══════

CALL public.setup_workspace_scoped_rls('document_types');

-- ══════ updated_at trigger ══════

CREATE TRIGGER document_types_updated_at
  BEFORE UPDATE ON public.document_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════ Comments ══════

COMMENT ON TABLE public.document_types IS
  '客戶證件種類字典。客人手上的證件（護照、台胞證、美簽…）的分類。租戶可自加（例：黃金簽證）。跟 application_service_types 區別：本表是物件、那張是作業。';
COMMENT ON COLUMN public.document_types.code IS
  '租戶內唯一 key、snake_case。例：passport_tw、passport_us、taiwan_pass、visa_us、visa_jp';
COMMENT ON COLUMN public.document_types.group_label IS
  'UI 分組標籤、選填。例：護照、港澳台、美洲簽證';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS document_types_updated_at ON public.document_types;
-- DROP TABLE IF EXISTS public.document_types CASCADE;
-- COMMIT;
