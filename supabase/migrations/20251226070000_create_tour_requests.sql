-- =============================================
-- 團體需求管理系統 (Tour Request Management System)
-- =============================================

-- 1. 主表：tour_requests（團體需求單）
CREATE TABLE IF NOT EXISTS public.tour_requests (
  -- 識別
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) UNIQUE NOT NULL,        -- 需求單編號 (TR250127A-001)

  -- 來源關聯
  tour_id UUID NOT NULL,                   -- 所屬團 ID
  tour_code VARCHAR(30),                   -- 團號快照
  tour_name VARCHAR(200),                  -- 團名快照
  order_id UUID,                           -- 關聯訂單（可選）

  -- 負責人類型
  handler_type VARCHAR(20) NOT NULL DEFAULT 'external',  -- 'internal' 或 'external'

  -- 內部處理（handler_type = 'internal'）
  assignee_id UUID,                        -- 指派給的員工 ID
  assignee_name VARCHAR(100),              -- 員工名稱快照

  -- 外部供應商（handler_type = 'external'）
  supplier_id UUID,                        -- 供應商 ID
  supplier_name VARCHAR(200),              -- 供應商名稱快照
  supplier_type VARCHAR(50),               -- 供應商類型

  -- 需求內容
  category VARCHAR(50) NOT NULL,           -- 需求類別：flight/hotel/transport/restaurant/ticket/guide/itinerary/other
  service_date DATE,                       -- 服務日期（開始）
  service_date_end DATE,                   -- 服務日期（結束，可選）
  title VARCHAR(200) NOT NULL,             -- 需求標題
  description TEXT,                        -- 詳細描述
  quantity INTEGER DEFAULT 1,              -- 數量/人數

  -- 需求規格（JSON，依類別不同）
  specifications JSONB DEFAULT '{}',       -- 詳細規格

  -- 團員綁定（機票、門票等需要綁定團員）
  member_ids UUID[] DEFAULT '{}',          -- 關聯的團員 IDs
  member_data JSONB DEFAULT '[]',          -- 團員相關資料（PNR、票券等）

  -- 狀態流程
  status VARCHAR(30) DEFAULT 'draft',      -- draft/pending/in_progress/replied/confirmed/completed/cancelled
  priority VARCHAR(20) DEFAULT 'normal',   -- urgent/high/normal/low

  -- 回覆內容
  reply_content JSONB DEFAULT '{}',        -- 回覆內容（結構化）
  reply_note TEXT,                         -- 回覆備註
  replied_at TIMESTAMPTZ,                  -- 回覆時間
  replied_by VARCHAR(100),                 -- 回覆人

  -- 費用
  estimated_cost DECIMAL(12,2),            -- 預估費用
  quoted_cost DECIMAL(12,2),               -- 報價費用
  final_cost DECIMAL(12,2),                -- 最終費用
  currency VARCHAR(10) DEFAULT 'TWD',      -- 幣別

  -- 確認資訊
  confirmed_at TIMESTAMPTZ,                -- 確認時間
  confirmed_by UUID,                       -- 確認人 ID
  confirmed_by_name VARCHAR(100),          -- 確認人名稱

  -- 同步到旅客 APP
  sync_to_app BOOLEAN DEFAULT false,       -- 是否同步到旅客 APP
  app_sync_data JSONB DEFAULT '{}',        -- 同步到 APP 的資料
  synced_at TIMESTAMPTZ,                   -- 同步時間

  -- Workspace 隔離
  workspace_id UUID NOT NULL,              -- 發送方 workspace
  target_workspace_id UUID,                -- 接收方 workspace（如果是系統內供應商）

  -- 審計
  created_by UUID,
  created_by_name VARCHAR(100),
  updated_by UUID,
  updated_by_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引（用 DO block 檢查欄位是否存在）
DO $$
DECLARE
  _col text;
  _cols text[] := ARRAY['tour_id','supplier_id','assignee_id','status','category','service_date','workspace_id','handler_type'];
  _idx text[] := ARRAY['idx_tour_requests_tour','idx_tour_requests_supplier','idx_tour_requests_assignee','idx_tour_requests_status','idx_tour_requests_category','idx_tour_requests_service_date','idx_tour_requests_workspace','idx_tour_requests_handler_type'];
BEGIN
  FOR i IN 1..array_length(_cols, 1) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tour_requests' AND column_name=_cols[i]) THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.tour_requests(%I)', _idx[i], _cols[i]);
    END IF;
  END LOOP;
END $$;

-- 2. 需求項目表：tour_request_items（需求細項）
CREATE TABLE IF NOT EXISTS public.tour_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.tour_requests(id) ON DELETE CASCADE,

  -- 項目內容
  item_type VARCHAR(50) NOT NULL,          -- 項目類型
  day_number INTEGER,                      -- 第幾天（行程用）
  description VARCHAR(500) NOT NULL,       -- 項目描述
  quantity INTEGER DEFAULT 1,              -- 數量
  unit VARCHAR(50),                        -- 單位
  unit_price DECIMAL(12,2),                -- 單價
  subtotal DECIMAL(12,2),                  -- 小計

  -- 規格
  specifications JSONB DEFAULT '{}',       -- 項目規格

  -- 回覆
  reply_status VARCHAR(30),                -- 項目回覆狀態
  reply_content JSONB DEFAULT '{}',        -- 項目回覆內容

  -- 排序
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_request_items_request ON public.tour_request_items(request_id);

-- 3. 溝通記錄表：tour_request_messages（需求單留言）
CREATE TABLE IF NOT EXISTS public.tour_request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.tour_requests(id) ON DELETE CASCADE,

  -- 發送者
  sender_type VARCHAR(20) NOT NULL,        -- 'requester' 或 'handler'
  sender_id UUID NOT NULL,
  sender_name VARCHAR(100),

  -- 內容
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',          -- 附件清單

  -- 狀態
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_request_messages_request ON public.tour_request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_tour_request_messages_sender ON public.tour_request_messages(sender_id);

-- 4. 團員票券表：tour_request_member_vouchers（個人票券綁定）
CREATE TABLE IF NOT EXISTS public.tour_request_member_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.tour_requests(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,                 -- 團員 ID (order_members.id)
  member_name VARCHAR(100),                -- 團員名稱快照

  -- 票券資訊
  voucher_type VARCHAR(50) NOT NULL,       -- 票券類型：flight_pnr/ticket/voucher
  voucher_code VARCHAR(100),               -- 票券代碼（PNR、票號等）
  voucher_file_url TEXT,                   -- 票券檔案 URL
  voucher_data JSONB DEFAULT '{}',         -- 額外資訊

  -- 費用
  unit_price DECIMAL(12,2),                -- 單價

  -- 狀態
  status VARCHAR(30) DEFAULT 'pending',    -- pending/confirmed/cancelled

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_request_member_vouchers_request ON public.tour_request_member_vouchers(request_id);
CREATE INDEX IF NOT EXISTS idx_tour_request_member_vouchers_member ON public.tour_request_member_vouchers(member_id);

-- 5. 視圖：團體需求單進度統計（只在必要欄位存在時建立）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tour_requests' AND column_name='tour_code') THEN
    CREATE OR REPLACE VIEW public.tour_requests_progress AS
    SELECT
      tour_id,
      tour_code,
      tour_name,
      workspace_id,
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE status = 'completed' OR status = 'confirmed') as completed_requests,
      COUNT(*) FILTER (WHERE status = 'draft') as draft_requests,
      COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress', 'replied')) as in_progress_requests,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_requests,
      ROUND(
        (COUNT(*) FILTER (WHERE status = 'completed' OR status = 'confirmed')::DECIMAL /
         NULLIF(COUNT(*) FILTER (WHERE status != 'cancelled'), 0)) * 100,
        0
      ) as completion_percentage
    FROM public.tour_requests
    GROUP BY tour_id, tour_code, tour_name, workspace_id;
  END IF;
END $$;

-- 6. 禁用 RLS（符合現有系統模式）
ALTER TABLE public.tour_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_request_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_request_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_request_member_vouchers DISABLE ROW LEVEL SECURITY;

-- 7. 觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_tour_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tour_requests_updated_at ON public.tour_requests;
CREATE TRIGGER trigger_tour_requests_updated_at
  BEFORE UPDATE ON public.tour_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_requests_updated_at();

DROP TRIGGER IF EXISTS trigger_tour_request_items_updated_at ON public.tour_request_items;
CREATE TRIGGER trigger_tour_request_items_updated_at
  BEFORE UPDATE ON public.tour_request_items
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_requests_updated_at();

DROP TRIGGER IF EXISTS trigger_tour_request_member_vouchers_updated_at ON public.tour_request_member_vouchers;
CREATE TRIGGER trigger_tour_request_member_vouchers_updated_at
  BEFORE UPDATE ON public.tour_request_member_vouchers
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_requests_updated_at();

-- 8. 註解
COMMENT ON TABLE public.tour_requests IS '團體需求單主表 - 統一管理內部任務和外部供應商需求';
COMMENT ON TABLE public.tour_request_items IS '團體需求單項目表 - 需求的細項（如多天行程）';
COMMENT ON TABLE public.tour_request_messages IS '團體需求單留言表 - 需求的溝通記錄';
COMMENT ON TABLE public.tour_request_member_vouchers IS '團員票券表 - 個人票券綁定（機票PNR、門票等）';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name='tour_requests_progress') THEN
    COMMENT ON VIEW public.tour_requests_progress IS '團體需求單進度統計視圖';
  END IF;
END $$;
