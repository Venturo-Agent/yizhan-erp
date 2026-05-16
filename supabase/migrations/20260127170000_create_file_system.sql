-- ============================================================================
-- Venturo ERP 檔案管理系統
-- 版本：1.0
-- 日期：2026-01-27
-- 功能：虛擬資料夾、檔案管理、自動分類、團/客戶/供應商關聯
-- ============================================================================

-- ============================================================================
-- 1. 資料夾類型列舉
-- ============================================================================

-- 系統預設資料夾類型（用於自動建立和分類）
DO $$ BEGIN
  CREATE TYPE folder_type AS ENUM ('root','tour','customer','supplier','template','custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 檔案分類（用於自動分類）
DO $$ BEGIN
  CREATE TYPE file_category AS ENUM ('contract','quote','itinerary','passport','visa','ticket','voucher','invoice','insurance','photo','email_attachment','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. 資料夾表：folders
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),

  -- 資料夾基本資訊
  name TEXT NOT NULL,
  folder_type folder_type NOT NULL DEFAULT 'custom',
  icon TEXT,                          -- Lucide icon 名稱
  color TEXT,                         -- 顏色 hex

  -- 樹狀結構
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  path TEXT NOT NULL,                 -- 完整路徑，如 /tours/CNX250128A/contracts
  depth INTEGER NOT NULL DEFAULT 0,   -- 層級深度

  -- 關聯實體（資料夾屬於誰）
  tour_id TEXT REFERENCES public.tours(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE CASCADE,

  -- 預設分類（此資料夾內檔案的預設分類）
  default_category file_category,

  -- 系統資料夾標記（不可刪除/重命名）
  is_system BOOLEAN NOT NULL DEFAULT false,

  -- 排序
  sort_order INTEGER DEFAULT 0,

  -- 通用欄位
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- 確保同一父資料夾下名稱唯一
  UNIQUE(workspace_id, parent_id, name)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_folders_workspace ON public.folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON public.folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_path ON public.folders(path);
CREATE INDEX IF NOT EXISTS idx_folders_tour ON public.folders(tour_id);
CREATE INDEX IF NOT EXISTS idx_folders_customer ON public.folders(customer_id);
CREATE INDEX IF NOT EXISTS idx_folders_supplier ON public.folders(supplier_id);

-- ============================================================================
-- 3. 檔案表：files
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,

  -- 檔案基本資訊
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,    -- 原始檔名
  content_type TEXT,                  -- MIME type
  size_bytes BIGINT,
  extension TEXT,                     -- 副檔名

  -- 儲存位置
  storage_path TEXT NOT NULL,         -- Supabase Storage 路徑
  storage_bucket TEXT NOT NULL DEFAULT 'files',
  thumbnail_path TEXT,                -- 縮圖路徑（圖片用）

  -- 分類
  category file_category NOT NULL DEFAULT 'other',
  tags TEXT[] DEFAULT '{}',           -- 自訂標籤

  -- 關聯實體（檔案屬於誰 - 可多重關聯）
  tour_id TEXT REFERENCES public.tours(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  email_id UUID REFERENCES public.emails(id) ON DELETE SET NULL,

  -- 來源
  source TEXT DEFAULT 'upload',       -- upload, email, scan, import
  source_email_attachment_id UUID,    -- 如果來自郵件附件

  -- 版本控制（簡易版）
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES public.files(id),

  -- 狀態
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,

  -- 存取統計
  download_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- 備註
  description TEXT,
  notes TEXT,

  -- 通用欄位
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_files_workspace ON public.files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_files_folder ON public.files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_tour ON public.files(tour_id);
CREATE INDEX IF NOT EXISTS idx_files_customer ON public.files(customer_id);
CREATE INDEX IF NOT EXISTS idx_files_supplier ON public.files(supplier_id);
CREATE INDEX IF NOT EXISTS idx_files_email ON public.files(email_id);
CREATE INDEX IF NOT EXISTS idx_files_category ON public.files(workspace_id, category);
CREATE INDEX IF NOT EXISTS idx_files_created ON public.files(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_search ON public.files
  USING gin(to_tsvector('simple', coalesce(filename, '') || ' ' || coalesce(description, '')));

-- ============================================================================
-- 4. 團預設資料夾模板
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tour_folder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id),  -- NULL = 全域模板

  name TEXT NOT NULL,
  icon TEXT,
  default_category file_category,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 插入預設模板（全域）
INSERT INTO public.tour_folder_templates (name, icon, default_category, sort_order) VALUES
  ('合約', 'FileSignature', 'contract', 1),
  ('報價單', 'FileText', 'quote', 2),
  ('行程表', 'Map', 'itinerary', 3),
  ('護照資料', 'CreditCard', 'passport', 4),
  ('簽證文件', 'Stamp', 'visa', 5),
  ('機票訂位', 'Plane', 'ticket', 6),
  ('住宿憑證', 'Building2', 'voucher', 7),
  ('保險文件', 'Shield', 'insurance', 8),
  ('發票收據', 'Receipt', 'invoice', 9),
  ('照片', 'Image', 'photo', 10),
  ('郵件附件', 'Paperclip', 'email_attachment', 11),
  ('其他文件', 'File', 'other', 99)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. 自動建立團資料夾的函式
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_tour_folders()
RETURNS TRIGGER AS $$
DECLARE
  v_tour_folder_id UUID;
  v_template RECORD;
  v_tour_path TEXT;
BEGIN
  -- 建立團的根資料夾
  v_tour_path := '/tours/' || NEW.code;

  INSERT INTO public.folders (
    workspace_id, name, folder_type, path, depth, tour_id, is_system, icon
  ) VALUES (
    NEW.workspace_id, NEW.code, 'tour', v_tour_path, 1, NEW.id, true, 'Folder'
  ) RETURNING id INTO v_tour_folder_id;

  -- 根據模板建立子資料夾
  FOR v_template IN
    SELECT * FROM public.tour_folder_templates
    WHERE (workspace_id = NEW.workspace_id OR workspace_id IS NULL)
      AND is_active = true
    ORDER BY sort_order
  LOOP
    INSERT INTO public.folders (
      workspace_id, name, folder_type, path, depth,
      parent_id, tour_id, is_system, icon, default_category, sort_order
    ) VALUES (
      NEW.workspace_id,
      v_template.name,
      'custom',
      v_tour_path || '/' || v_template.name,
      2,
      v_tour_folder_id,
      NEW.id,
      true,
      v_template.icon,
      v_template.default_category,
      v_template.sort_order
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 觸發器：建立團時自動建立資料夾
DROP TRIGGER IF EXISTS tr_create_tour_folders ON public.tours;
CREATE TRIGGER tr_create_tour_folders
  AFTER INSERT ON public.tours
  FOR EACH ROW EXECUTE FUNCTION public.create_tour_folders();

-- ============================================================================
-- 6. 自動分類檔案的函式
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_categorize_file()
RETURNS TRIGGER AS $$
DECLARE
  v_extension TEXT;
  v_filename_lower TEXT;
BEGIN
  -- 如果已經有分類，不覆蓋
  IF NEW.category IS NOT NULL AND NEW.category != 'other' THEN
    RETURN NEW;
  END IF;

  v_extension := lower(NEW.extension);
  v_filename_lower := lower(NEW.original_filename);

  -- 根據檔名關鍵字判斷
  IF v_filename_lower LIKE '%護照%' OR v_filename_lower LIKE '%passport%' THEN
    NEW.category := 'passport';
  ELSIF v_filename_lower LIKE '%簽證%' OR v_filename_lower LIKE '%visa%' THEN
    NEW.category := 'visa';
  ELSIF v_filename_lower LIKE '%合約%' OR v_filename_lower LIKE '%contract%' THEN
    NEW.category := 'contract';
  ELSIF v_filename_lower LIKE '%報價%' OR v_filename_lower LIKE '%quote%' THEN
    NEW.category := 'quote';
  ELSIF v_filename_lower LIKE '%行程%' OR v_filename_lower LIKE '%itinerary%' THEN
    NEW.category := 'itinerary';
  ELSIF v_filename_lower LIKE '%機票%' OR v_filename_lower LIKE '%ticket%' OR v_filename_lower LIKE '%eticket%' THEN
    NEW.category := 'ticket';
  ELSIF v_filename_lower LIKE '%訂房%' OR v_filename_lower LIKE '%voucher%' OR v_filename_lower LIKE '%confirmation%' THEN
    NEW.category := 'voucher';
  ELSIF v_filename_lower LIKE '%發票%' OR v_filename_lower LIKE '%invoice%' OR v_filename_lower LIKE '%receipt%' THEN
    NEW.category := 'invoice';
  ELSIF v_filename_lower LIKE '%保險%' OR v_filename_lower LIKE '%insurance%' THEN
    NEW.category := 'insurance';
  ELSIF v_extension IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'heic') THEN
    NEW.category := 'photo';
  ELSE
    NEW.category := 'other';
  END IF;

  -- 如果檔案在有 default_category 的資料夾內，使用資料夾的分類
  IF NEW.folder_id IS NOT NULL THEN
    SELECT default_category INTO NEW.category
    FROM public.folders
    WHERE id = NEW.folder_id AND default_category IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 觸發器：上傳檔案時自動分類
DROP TRIGGER IF EXISTS tr_auto_categorize_file ON public.files;
CREATE TRIGGER tr_auto_categorize_file
  BEFORE INSERT ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.auto_categorize_file();

-- ============================================================================
-- 7. 自動移動檔案到對應資料夾
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_move_file_to_folder()
RETURNS TRIGGER AS $$
DECLARE
  v_folder_id UUID;
BEGIN
  -- 如果已經有 folder_id，不處理
  IF NEW.folder_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 如果有 tour_id，找到對應分類的資料夾
  IF NEW.tour_id IS NOT NULL AND NEW.category IS NOT NULL THEN
    SELECT f.id INTO v_folder_id
    FROM public.folders f
    WHERE f.tour_id = NEW.tour_id
      AND f.default_category = NEW.category
    LIMIT 1;

    IF v_folder_id IS NOT NULL THEN
      NEW.folder_id := v_folder_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 觸發器：上傳檔案時自動移到對應資料夾
DROP TRIGGER IF EXISTS tr_auto_move_file ON public.files;
CREATE TRIGGER tr_auto_move_file
  BEFORE INSERT ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.auto_move_file_to_folder();

-- ============================================================================
-- 8. RLS 政策
-- ============================================================================

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_folder_templates ENABLE ROW LEVEL SECURITY;

-- folders 政策
CREATE POLICY "folders_select" ON public.folders
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "folders_insert" ON public.folders
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "folders_update" ON public.folders
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "folders_delete" ON public.folders
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
    AND is_system = false  -- 系統資料夾不可刪除
  );

-- files 政策
CREATE POLICY "files_select" ON public.files
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "files_insert" ON public.files
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "files_update" ON public.files
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "files_delete" ON public.files
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

-- tour_folder_templates 政策（全域模板所有人可讀）
CREATE POLICY "templates_select" ON public.tour_folder_templates
  FOR SELECT USING (
    workspace_id IS NULL OR
    workspace_id IN (
      SELECT workspace_id FROM public.employees
      WHERE supabase_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. 更新觸發器
-- ============================================================================

CREATE OR REPLACE FUNCTION update_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_folders_updated_at ON public.folders;
CREATE TRIGGER tr_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION update_folders_updated_at();

CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_files_updated_at ON public.files;
CREATE TRIGGER tr_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION update_files_updated_at();

-- ============================================================================
-- 10. 註解
-- ============================================================================

COMMENT ON TABLE public.folders IS '虛擬資料夾結構，支援樹狀目錄';
COMMENT ON TABLE public.files IS '檔案記錄，關聯團/客戶/供應商';
COMMENT ON TABLE public.tour_folder_templates IS '團資料夾模板，新增團時自動建立';

COMMENT ON COLUMN public.folders.path IS '完整路徑，如 /tours/CNX250128A/contracts';
COMMENT ON COLUMN public.folders.is_system IS '系統資料夾不可刪除/重命名';
COMMENT ON COLUMN public.folders.default_category IS '此資料夾內檔案的預設分類';

COMMENT ON COLUMN public.files.category IS '檔案分類，上傳時自動判斷或手動指定';
COMMENT ON COLUMN public.files.source IS '來源：upload=上傳, email=郵件附件, scan=掃描, import=匯入';

COMMENT ON FUNCTION public.create_tour_folders IS '建立團時自動建立標準資料夾結構';
COMMENT ON FUNCTION public.auto_categorize_file IS '根據檔名自動判斷檔案分類';
COMMENT ON FUNCTION public.auto_move_file_to_folder IS '根據分類自動移到對應資料夾';
