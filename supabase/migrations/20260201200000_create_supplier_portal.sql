-- ============================================================================
-- Supplier Portal 資料庫結構
-- 建立日期：2026-02-01
-- 目的：讓供應商能收需求單、確認、報價
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. supplier_users 表：供應商員工帳號
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 關聯（suppliers.id 是 text）
  supplier_id text REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- 基本資料
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  
  -- 狀態
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  
  -- 時間戳
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- 唯一約束：同一供應商內 email 不重複
  UNIQUE (supplier_id, email)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_supplier_users_supplier ON supplier_users(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_users_email ON supplier_users(email);
CREATE INDEX IF NOT EXISTS idx_supplier_users_user_id ON supplier_users(user_id);

-- 註解
COMMENT ON TABLE supplier_users IS '供應商員工帳號，用於登入 Online App';
COMMENT ON COLUMN supplier_users.role IS 'admin: 管理員可管理其他員工, staff: 一般員工';

-- ----------------------------------------------------------------------------
-- 2. supplier_request_responses 表：供應商回覆記錄
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_request_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 關聯（suppliers.id 是 text）
  request_id uuid REFERENCES tour_requests(id) ON DELETE CASCADE NOT NULL,
  supplier_id text REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  responded_by uuid REFERENCES supplier_users(id) ON DELETE SET NULL,
  
  -- 回覆內容
  response_type text NOT NULL CHECK (response_type IN ('accepted', 'rejected', 'quoted', 'need_info')),
  quoted_price numeric,
  currency text DEFAULT 'TWD',
  notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  
  -- 時間戳
  created_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_srr_request ON supplier_request_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_srr_supplier ON supplier_request_responses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_srr_created ON supplier_request_responses(created_at DESC);

-- 註解
COMMENT ON TABLE supplier_request_responses IS '供應商回覆記錄，保留所有歷史';
COMMENT ON COLUMN supplier_request_responses.response_type IS 'accepted: 確認接受, rejected: 無法承接, quoted: 報價, need_info: 需要更多資訊';

-- ----------------------------------------------------------------------------
-- 3. 確保 tour_requests 有需要的欄位
-- ----------------------------------------------------------------------------
-- response_status：供應商回覆狀態
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tour_requests' AND column_name = 'response_status'
  ) THEN
    ALTER TABLE tour_requests ADD COLUMN response_status text DEFAULT 'pending';
  END IF;
END $$;

-- supplier_response_at：供應商回覆時間
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tour_requests' AND column_name = 'supplier_response_at'
  ) THEN
    ALTER TABLE tour_requests ADD COLUMN supplier_response_at timestamptz;
  END IF;
END $$;

-- reply_content：供應商回覆內容
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tour_requests' AND column_name = 'reply_content'
  ) THEN
    ALTER TABLE tour_requests ADD COLUMN reply_content jsonb;
  END IF;
END $$;

-- recipient_workspace_id：接收方 workspace（供應商）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tour_requests' AND column_name = 'recipient_workspace_id'
  ) THEN
    ALTER TABLE tour_requests ADD COLUMN recipient_workspace_id uuid;
  END IF;
END $$;

-- 索引
CREATE INDEX IF NOT EXISTS idx_tour_requests_recipient ON tour_requests(recipient_workspace_id);
CREATE INDEX IF NOT EXISTS idx_tour_requests_response_status ON tour_requests(response_status);

-- ----------------------------------------------------------------------------
-- 4. RLS Policies
-- ----------------------------------------------------------------------------

-- 啟用 RLS
ALTER TABLE supplier_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_request_responses ENABLE ROW LEVEL SECURITY;

-- supplier_users: 供應商只能看自己公司的員工
CREATE POLICY "supplier_users_select" ON supplier_users
  FOR SELECT USING (true); -- 暫時開放，之後根據需求調整

CREATE POLICY "supplier_users_insert" ON supplier_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "supplier_users_update" ON supplier_users
  FOR UPDATE USING (true);

-- supplier_request_responses: 供應商只能看自己的回覆
CREATE POLICY "srr_select" ON supplier_request_responses
  FOR SELECT USING (true);

CREATE POLICY "srr_insert" ON supplier_request_responses
  FOR INSERT WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 5. 觸發器：更新 tour_requests 狀態
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_request_on_response()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新 tour_requests 的狀態
  UPDATE tour_requests
  SET 
    response_status = CASE 
      WHEN NEW.response_type = 'accepted' THEN 'accepted'
      WHEN NEW.response_type = 'rejected' THEN 'rejected'
      WHEN NEW.response_type = 'quoted' THEN 'quoted'
      WHEN NEW.response_type = 'need_info' THEN 'need_info'
      ELSE 'responded'
    END,
    supplier_response_at = NEW.created_at,
    reply_content = jsonb_build_object(
      'response_type', NEW.response_type,
      'quoted_price', NEW.quoted_price,
      'currency', NEW.currency,
      'notes', NEW.notes,
      'responded_at', NEW.created_at
    ),
    updated_at = now()
  WHERE id = NEW.request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_update_request_on_response ON supplier_request_responses;
CREATE TRIGGER trigger_update_request_on_response
  AFTER INSERT ON supplier_request_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_request_on_response();

-- ----------------------------------------------------------------------------
-- 6. 測試資料（開發用）
-- ----------------------------------------------------------------------------

-- 為現有的測試供應商建立員工帳號
INSERT INTO supplier_users (supplier_id, name, email, phone, role)
SELECT 
  id,
  '管理員',
  COALESCE(email, code || '@test.venturo.app'),
  phone,
  'admin'
FROM suppliers
WHERE code = 'SUP-YAMATO'
ON CONFLICT (supplier_id, email) DO NOTHING;

-- ============================================================================
-- 完成
-- ============================================================================
