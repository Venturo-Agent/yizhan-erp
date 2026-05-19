-- ════════════════════════════════════════════════════════════════════
-- customer_documents — 客戶證件抽屜（主檔）
-- ════════════════════════════════════════════════════════════════════
--
-- 為什麼建：
--   過去：customers 表上 5 個 inline passport_* 欄位、一個客戶只能存一張
--   護照、沒辦法存其他證件（台胞證、美簽）、沒有歷史。
--
--   William 2026-05-20 拍板新模型：證件 = 客戶資產，跟客戶綁、跟「這次團」
--   解耦。客戶可有 N 張證件（多本護照、各國簽證）、各自有效期 / 號碼 /
--   申辦歷史。下次開新團時系統翻客戶證件抽屜、提醒「美簽快過期、要不要順
--   便辦」。
--
--   重要：客人可能不是找我們辦的（自己辦過、或找別家辦）。所以本表獨立
--   運作、不一定要有對應的 customer_document_applications row。
--
-- 跟 customers.passport_* 五欄的關係：
--   本 migration 上線時、那 5 欄會被另一支「migrations-pending/」的 migration
--   遷移到本表並 DROP COLUMN。William 拍板「不要補丁、不留雙軌」。
--
-- 6 層 SOP：
--   L1 Feature Gate → visas
--   L2 Capability   → visas.documents.{read,write}
--   L3 三維 Scope   → 透過 customers 繼承 scope（setup_inherited_rls）
--   L4 狀態守門     → status check constraint + is_primary 唯一性
--   L5 RLS          → setup_inherited_rls('customer_documents', 'customers', 'customer_id')
--   L6 防呆 SSOT    → created_by/updated_by FK 指 employees(id)（紅線 B）
-- ════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE public.customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 客戶歸屬（cascade、客戶砍掉證件也砍）
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  -- 證件種類（指向字典）
  document_type_id uuid NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,

  -- ─── 證件本身的資料（拿到了才填）────
  -- 號碼（辦理中時 NULL）
  document_number text,

  -- 證件上的姓名（含拼音 / 英文名、給契約 / 訂位用）
  document_name text,

  -- 列印用格式（行李吊牌 / 簽證表格、給 print 用）
  document_name_print text,

  -- 證件圖片（supabase storage URL）
  image_url text,

  -- 效期
  valid_from date,
  expires_on date,

  -- ─── 狀態 ────
  -- processing：辦理中（號碼還沒拿到）
  -- active：有效（is_primary 應為 true）
  -- expired：已過期或被新證件取代（重辦時舊那張自動標 expired）
  -- rejected：申辦被退件、最後沒拿到（給 0 次申辦無 fk 用、留紀錄）
  -- superseded：被新版同類型證件取代（重辦完成觸發）
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'active', 'expired', 'rejected', 'superseded')),

  -- 是否為該（客戶 × 證件種類）的當前生效那張
  -- 同一客戶、同一種類、最多只能有一張 is_primary=true（partial unique index 守）
  is_primary boolean NOT NULL DEFAULT false,

  -- 自由備註
  notes text,

  -- 審計欄位（紅線 B）
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ══════ Index ══════

-- L4 業務鎖：一個客戶同一種證件只能有一張 primary
CREATE UNIQUE INDEX customer_documents_one_primary_per_type
  ON public.customer_documents (customer_id, document_type_id)
  WHERE is_primary = true AND deleted_at IS NULL;

-- 抽屜頁主查詢（列某客戶的所有證件、依序顯示）
CREATE INDEX customer_documents_customer_type_idx
  ON public.customer_documents (customer_id, document_type_id, is_primary DESC, created_at DESC)
  WHERE deleted_at IS NULL;

-- 效期到期警示（cron / 報表用）
CREATE INDEX customer_documents_expires_on_idx
  ON public.customer_documents (workspace_id, expires_on)
  WHERE deleted_at IS NULL AND status = 'active' AND expires_on IS NOT NULL;

-- 號碼搜尋（給跨客戶找「這個號碼是誰的」）
CREATE INDEX customer_documents_number_idx
  ON public.customer_documents (workspace_id, document_number)
  WHERE deleted_at IS NULL AND document_number IS NOT NULL;

CREATE INDEX customer_documents_deleted_at_idx
  ON public.customer_documents (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ══════ RLS（透過 customers 繼承 scope）══════

CALL public.setup_inherited_rls('customer_documents', 'customers', 'customer_id');

-- ══════ updated_at trigger ══════

CREATE TRIGGER customer_documents_updated_at
  BEFORE UPDATE ON public.customer_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════ Comments ══════

COMMENT ON TABLE public.customer_documents IS
  '客戶證件抽屜。多本同類型重辦時、舊那張 is_primary=false + status=superseded、新那張 is_primary=true。客戶自己辦的（不是找我們辦）也直接寫一筆、application 那邊留空。';
COMMENT ON COLUMN public.customer_documents.is_primary IS
  '同（客戶 × 證件種類）只能一張 true（partial unique index 守）。重辦完成時 RPC 自動把舊那張改 false。';
COMMENT ON COLUMN public.customer_documents.status IS
  'processing 辦理中、active 有效、expired 過期、rejected 退件、superseded 被新版取代';

COMMIT;

-- ════ Rollback ════
-- BEGIN;
-- DROP TRIGGER IF EXISTS customer_documents_updated_at ON public.customer_documents;
-- DROP TABLE IF EXISTS public.customer_documents CASCADE;
-- COMMIT;
