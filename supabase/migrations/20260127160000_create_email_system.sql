-- ============================================================================
-- Venturo ERP 郵件系統
-- 版本：1.0
-- 日期：2026-01-27
-- 功能：收發郵件、自動關聯客戶/供應商、多租戶支援
-- ============================================================================

-- ============================================================================
-- 1. 主表：emails
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),

  -- 郵件識別（用於追蹤與去重）
  message_id TEXT UNIQUE,              -- RFC 2822 Message-ID
  thread_id TEXT,                      -- 對話串 ID（用於群組相關郵件）
  in_reply_to TEXT,                    -- 回覆的郵件 message_id

  -- 收發方向
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',      -- 草稿
    'queued',     -- 排隊發送中
    'sending',    -- 發送中
    'sent',       -- 已發送
    'delivered',  -- 已送達
    'failed',     -- 發送失敗
    'received'    -- 已收到（inbound）
  )),

  -- 寄件人
  from_address TEXT NOT NULL,
  from_name TEXT,

  -- 收件人（JSONB 格式：[{email: string, name?: string}]）
  to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_addresses JSONB DEFAULT '[]'::jsonb,
  bcc_addresses JSONB DEFAULT '[]'::jsonb,
  reply_to_address TEXT,

  -- 郵件內容
  subject TEXT,
  body_text TEXT,                      -- 純文字版本
  body_html TEXT,                      -- HTML 版本

  -- 自動關聯（根據寄件人/收件人 email 自動匹配）
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  tour_id TEXT REFERENCES public.tours(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,

  -- 使用者操作標記
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_trash BOOLEAN NOT NULL DEFAULT false,

  -- 標籤（自訂分類）
  labels TEXT[] DEFAULT '{}',

  -- 發送相關
  scheduled_at TIMESTAMPTZ,            -- 排程發送時間
  sent_at TIMESTAMPTZ,                 -- 實際發送時間
  delivered_at TIMESTAMPTZ,            -- 送達時間
  received_at TIMESTAMPTZ,             -- 收到時間（inbound）

  -- 錯誤處理
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- 外部服務追蹤
  external_id TEXT,                    -- Resend 或其他服務的 ID

  -- 通用欄位
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_emails_workspace ON public.emails(workspace_id);
CREATE INDEX IF NOT EXISTS idx_emails_direction ON public.emails(workspace_id, direction);
CREATE INDEX IF NOT EXISTS idx_emails_status ON public.emails(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_emails_from ON public.emails(from_address);
CREATE INDEX IF NOT EXISTS idx_emails_thread ON public.emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_customer ON public.emails(customer_id);
CREATE INDEX IF NOT EXISTS idx_emails_supplier ON public.emails(supplier_id);
CREATE INDEX IF NOT EXISTS idx_emails_tour ON public.emails(tour_id);
CREATE INDEX IF NOT EXISTS idx_emails_created ON public.emails(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_unread ON public.emails(workspace_id, is_read) WHERE is_read = false;

-- 全文搜尋索引
CREATE INDEX IF NOT EXISTS idx_emails_search ON public.emails
  USING gin(to_tsvector('simple', coalesce(subject, '') || ' ' || coalesce(body_text, '')));

-- 觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_emails_updated_at ON public.emails;
CREATE TRIGGER tr_emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION update_emails_updated_at();

-- ============================================================================
-- 2. 附件表：email_attachments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),

  -- 檔案資訊
  filename TEXT NOT NULL,
  content_type TEXT,                   -- MIME type (e.g., 'application/pdf')
  size_bytes BIGINT,

  -- 儲存位置（二選一）
  storage_path TEXT,                   -- Supabase Storage 路徑
  external_url TEXT,                   -- 外部 URL（如 Resend CDN）

  -- 內嵌圖片用
  content_id TEXT,                     -- CID for inline images
  is_inline BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_email_attachments_email ON public.email_attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_workspace ON public.email_attachments(workspace_id);

-- ============================================================================
-- 3. 郵件帳戶設定：email_accounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),

  -- 帳戶資訊
  email_address TEXT NOT NULL,         -- 如 info@venturo.com
  display_name TEXT,                   -- 顯示名稱

  -- 類型
  account_type TEXT NOT NULL DEFAULT 'shared' CHECK (account_type IN (
    'shared',     -- 共用帳戶（如 info@）
    'personal'    -- 個人帳戶
  )),

  -- 擁有者（personal 類型時必填）
  owner_id UUID REFERENCES public.employees(id),

  -- 狀態
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,

  -- 簽名檔
  signature_html TEXT,
  signature_text TEXT,

  -- 設定（JSONB 存放額外設定）
  settings JSONB DEFAULT '{}'::jsonb,

  -- 驗證狀態
  domain_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 確保同一 workspace 內 email 不重複
  UNIQUE(workspace_id, email_address)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_email_accounts_workspace ON public.email_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_owner ON public.email_accounts(owner_id);

-- ============================================================================
-- 4. RLS 政策
-- ============================================================================

-- 啟用 RLS
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

-- emails 政策
CREATE POLICY "emails_select" ON public.emails
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "emails_insert" ON public.emails
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "emails_update" ON public.emails
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "emails_delete" ON public.emails
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

-- email_attachments 政策
CREATE POLICY "email_attachments_select" ON public.email_attachments
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "email_attachments_insert" ON public.email_attachments
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "email_attachments_delete" ON public.email_attachments
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

-- email_accounts 政策
CREATE POLICY "email_accounts_select" ON public.email_accounts
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "email_accounts_insert" ON public.email_accounts
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "email_accounts_update" ON public.email_accounts
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. 輔助函式：自動關聯客戶/供應商
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_link_email_contacts()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id TEXT;
  v_supplier_id TEXT;
  v_email TEXT;
BEGIN
  -- 只處理 inbound 郵件
  IF NEW.direction = 'inbound' AND NEW.customer_id IS NULL AND NEW.supplier_id IS NULL THEN
    v_email := NEW.from_address;

    -- 嘗試匹配客戶
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE workspace_id = NEW.workspace_id
      AND (email = v_email OR alternative_email = v_email)
    LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
      NEW.customer_id := v_customer_id;
    ELSE
      -- 嘗試匹配供應商
      SELECT id INTO v_supplier_id
      FROM public.suppliers
      WHERE workspace_id = NEW.workspace_id
        AND email = v_email
      LIMIT 1;

      IF v_supplier_id IS NOT NULL THEN
        NEW.supplier_id := v_supplier_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auto_link_email_contacts ON public.emails;
CREATE TRIGGER tr_auto_link_email_contacts
  BEFORE INSERT ON public.emails
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_email_contacts();

-- ============================================================================
-- 6. 註解
-- ============================================================================

COMMENT ON TABLE public.emails IS '郵件主表，支援收發信、自動關聯客戶供應商';
COMMENT ON TABLE public.email_attachments IS '郵件附件';
COMMENT ON TABLE public.email_accounts IS '郵件帳戶設定（支援多網域）';

COMMENT ON COLUMN public.emails.direction IS '郵件方向：inbound=收信, outbound=發信';
COMMENT ON COLUMN public.emails.status IS '狀態：draft/queued/sending/sent/delivered/failed/received';
COMMENT ON COLUMN public.emails.thread_id IS '對話串 ID，用於群組相關郵件';
COMMENT ON COLUMN public.emails.to_addresses IS 'JSONB 格式：[{email: string, name?: string}]';
COMMENT ON COLUMN public.emails.labels IS '自訂標籤陣列';

COMMENT ON COLUMN public.email_accounts.account_type IS '帳戶類型：shared=共用(info@), personal=個人';
