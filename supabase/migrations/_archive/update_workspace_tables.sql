-- ============================================
-- Workspace 工作空間系統 - 更新現有表結構
-- ============================================
-- 建立日期：2025-01-22
-- 說明：為現有的 workspace 相關表添加缺少的欄位
-- 注意：表已存在，只添加缺少的欄位和索引
-- ============================================

-- ============================================
-- 1. 更新 workspaces 表
-- ============================================

-- 添加離線同步欄位
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = '_needs_sync') THEN
    ALTER TABLE workspaces ADD COLUMN _needs_sync BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = '_synced_at') THEN
    ALTER TABLE workspaces ADD COLUMN _synced_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = '_deleted') THEN
    ALTER TABLE workspaces ADD COLUMN _deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_workspaces_needs_sync ON workspaces(_needs_sync) WHERE _needs_sync = true;

-- ============================================
-- 2. 建立 channel_groups 表（如果不存在）
-- ============================================
CREATE TABLE IF NOT EXISTS channel_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_collapsed BOOLEAN DEFAULT false,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  _needs_sync BOOLEAN DEFAULT false,
  _synced_at TIMESTAMP WITH TIME ZONE,
  _deleted BOOLEAN DEFAULT false
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_channel_groups_workspace ON channel_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channel_groups_order ON channel_groups("order");

-- ============================================
-- 3. 更新 channels 表
-- ============================================

-- 添加缺少的欄位
DO $$
BEGIN
  -- group_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'group_id') THEN
    ALTER TABLE channels ADD COLUMN group_id UUID REFERENCES channel_groups(id) ON DELETE SET NULL;
  END IF;

  -- tour_id（注意：tours.id 是 text 類型）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'tour_id') THEN
    ALTER TABLE channels ADD COLUMN tour_id TEXT REFERENCES tours(id) ON DELETE CASCADE;
  END IF;

  -- is_favorite
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'is_favorite') THEN
    ALTER TABLE channels ADD COLUMN is_favorite BOOLEAN DEFAULT false;
  END IF;

  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'updated_at') THEN
    ALTER TABLE channels ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- 離線同步欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = '_needs_sync') THEN
    ALTER TABLE channels ADD COLUMN _needs_sync BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = '_synced_at') THEN
    ALTER TABLE channels ADD COLUMN _synced_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = '_deleted') THEN
    ALTER TABLE channels ADD COLUMN _deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_channels_group ON channels(group_id);
CREATE INDEX IF NOT EXISTS idx_channels_tour ON channels(tour_id);
CREATE INDEX IF NOT EXISTS idx_channels_favorite ON channels(is_favorite) WHERE is_favorite = true;

-- ============================================
-- 4. 更新 messages 表
-- ============================================

-- 添加缺少的欄位
DO $$
BEGIN
  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'updated_at') THEN
    ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- 離線同步欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = '_needs_sync') THEN
    ALTER TABLE messages ADD COLUMN _needs_sync BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = '_synced_at') THEN
    ALTER TABLE messages ADD COLUMN _synced_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = '_deleted') THEN
    ALTER TABLE messages ADD COLUMN _deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- 5. 更新 bulletins 表
-- ============================================

-- 添加離線同步欄位
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bulletins' AND column_name = '_needs_sync') THEN
    ALTER TABLE bulletins ADD COLUMN _needs_sync BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bulletins' AND column_name = '_synced_at') THEN
    ALTER TABLE bulletins ADD COLUMN _synced_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bulletins' AND column_name = '_deleted') THEN
    ALTER TABLE bulletins ADD COLUMN _deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- 6. 建立 advance_lists 表
-- ============================================
CREATE TABLE IF NOT EXISTS advance_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES employees(id),  -- employees.id 是 text 類型
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  _needs_sync BOOLEAN DEFAULT false,
  _synced_at TIMESTAMP WITH TIME ZONE,
  _deleted BOOLEAN DEFAULT false
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_advance_lists_channel ON advance_lists(channel_id);
CREATE INDEX IF NOT EXISTS idx_advance_lists_created_by ON advance_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_advance_lists_created_at ON advance_lists(created_at DESC);

-- ============================================
-- 7. 建立 advance_items 表
-- ============================================
CREATE TABLE IF NOT EXISTS advance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_list_id UUID NOT NULL REFERENCES advance_lists(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  advance_person VARCHAR(100) NOT NULL,  -- 員工姓名（不用外鍵，因為是自由輸入）
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  payment_request_id TEXT REFERENCES payment_requests(id) ON DELETE SET NULL,  -- payment_requests.id 是 text 類型
  processed_by TEXT REFERENCES employees(id),  -- employees.id 是 text 類型
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  _needs_sync BOOLEAN DEFAULT false,
  _synced_at TIMESTAMP WITH TIME ZONE,
  _deleted BOOLEAN DEFAULT false
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_advance_items_list ON advance_items(advance_list_id);
CREATE INDEX IF NOT EXISTS idx_advance_items_status ON advance_items(status);
CREATE INDEX IF NOT EXISTS idx_advance_items_payment_request ON advance_items(payment_request_id);

-- ============================================
-- 8. 建立 shared_order_lists 表
-- ============================================
CREATE TABLE IF NOT EXISTS shared_order_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  order_ids JSONB NOT NULL DEFAULT '[]',  -- 存放 orders.id（text 類型）陣列
  created_by TEXT NOT NULL REFERENCES employees(id),  -- employees.id 是 text 類型
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  _needs_sync BOOLEAN DEFAULT false,
  _synced_at TIMESTAMP WITH TIME ZONE,
  _deleted BOOLEAN DEFAULT false
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_shared_order_lists_channel ON shared_order_lists(channel_id);
CREATE INDEX IF NOT EXISTS idx_shared_order_lists_created_by ON shared_order_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_shared_order_lists_created_at ON shared_order_lists(created_at DESC);

-- ============================================
-- Row Level Security (RLS) 政策
-- ============================================

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_order_lists ENABLE ROW LEVEL SECURITY;

-- 刪除舊政策（如果存在）
DROP POLICY IF EXISTS "所有用戶可讀取工作空間" ON workspaces;
DROP POLICY IF EXISTS "所有用戶可管理工作空間" ON workspaces;
DROP POLICY IF EXISTS "所有用戶可讀取頻道群組" ON channel_groups;
DROP POLICY IF EXISTS "所有用戶可建立頻道群組" ON channel_groups;
DROP POLICY IF EXISTS "所有用戶可更新頻道群組" ON channel_groups;
DROP POLICY IF EXISTS "所有用戶可刪除頻道群組" ON channel_groups;
DROP POLICY IF EXISTS "所有用戶可讀取頻道" ON channels;
DROP POLICY IF EXISTS "所有用戶可建立頻道" ON channels;
DROP POLICY IF EXISTS "所有用戶可更新頻道" ON channels;
DROP POLICY IF EXISTS "所有用戶可刪除頻道" ON channels;
DROP POLICY IF EXISTS "所有用戶可讀取訊息" ON messages;
DROP POLICY IF EXISTS "所有用戶可建立訊息" ON messages;
DROP POLICY IF EXISTS "所有用戶可更新訊息" ON messages;
DROP POLICY IF EXISTS "所有用戶可刪除訊息" ON messages;
DROP POLICY IF EXISTS "所有用戶可讀取公告" ON bulletins;
DROP POLICY IF EXISTS "所有用戶可建立公告" ON bulletins;
DROP POLICY IF EXISTS "所有用戶可更新公告" ON bulletins;
DROP POLICY IF EXISTS "所有用戶可刪除公告" ON bulletins;
DROP POLICY IF EXISTS "所有用戶可讀取代墊清單" ON advance_lists;
DROP POLICY IF EXISTS "所有用戶可建立代墊清單" ON advance_lists;
DROP POLICY IF EXISTS "所有用戶可更新代墊清單" ON advance_lists;
DROP POLICY IF EXISTS "所有用戶可刪除代墊清單" ON advance_lists;
DROP POLICY IF EXISTS "所有用戶可讀取代墊項目" ON advance_items;
DROP POLICY IF EXISTS "所有用戶可建立代墊項目" ON advance_items;
DROP POLICY IF EXISTS "所有用戶可更新代墊項目" ON advance_items;
DROP POLICY IF EXISTS "所有用戶可刪除代墊項目" ON advance_items;
DROP POLICY IF EXISTS "所有用戶可讀取分享訂單列表" ON shared_order_lists;
DROP POLICY IF EXISTS "所有用戶可建立分享訂單列表" ON shared_order_lists;
DROP POLICY IF EXISTS "所有用戶可更新分享訂單列表" ON shared_order_lists;
DROP POLICY IF EXISTS "所有用戶可刪除分享訂單列表" ON shared_order_lists;

-- 建立簡化的政策（允許所有操作，因為沒有 Supabase Auth）
-- Workspaces
CREATE POLICY "所有用戶可讀取工作空間" ON workspaces FOR SELECT USING (true);
CREATE POLICY "所有用戶可管理工作空間" ON workspaces FOR ALL USING (true);

-- Channel Groups
CREATE POLICY "所有用戶可讀取頻道群組" ON channel_groups FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立頻道群組" ON channel_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "所有用戶可更新頻道群組" ON channel_groups FOR UPDATE USING (true);
CREATE POLICY "所有用戶可刪除頻道群組" ON channel_groups FOR DELETE USING (true);

-- Channels
CREATE POLICY "所有用戶可讀取頻道" ON channels FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立頻道" ON channels FOR INSERT WITH CHECK (true);
CREATE POLICY "所有用戶可更新頻道" ON channels FOR UPDATE USING (true);
CREATE POLICY "所有用戶可刪除頻道" ON channels FOR DELETE USING (true);

-- Messages
CREATE POLICY "所有用戶可讀取訊息" ON messages FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立訊息" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "所有用戶可更新訊息" ON messages FOR UPDATE USING (true);
CREATE POLICY "所有用戶可刪除訊息" ON messages FOR DELETE USING (true);

-- Bulletins
CREATE POLICY "所有用戶可讀取公告" ON bulletins FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立公告" ON bulletins FOR INSERT WITH CHECK (true);
CREATE POLICY "所有用戶可更新公告" ON bulletins FOR UPDATE USING (true);
CREATE POLICY "所有用戶可刪除公告" ON bulletins FOR DELETE USING (true);

-- Advance Lists
CREATE POLICY "所有用戶可讀取代墊清單" ON advance_lists FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立代墊清單" ON advance_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "所有用戶可更新代墊清單" ON advance_lists FOR UPDATE USING (true);
CREATE POLICY "所有用戶可刪除代墊清單" ON advance_lists FOR DELETE USING (true);

-- Advance Items
CREATE POLICY "所有用戶可讀取代墊項目" ON advance_items FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立代墊項目" ON advance_items FOR INSERT WITH CHECK (true);
CREATE POLICY "所有用戶可更新代墊項目" ON advance_items FOR UPDATE USING (true);
CREATE POLICY "所有用戶可刪除代墊項目" ON advance_items FOR DELETE USING (true);

-- Shared Order Lists
CREATE POLICY "所有用戶可讀取分享訂單列表" ON shared_order_lists FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立分享訂單列表" ON shared_order_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "所有用戶可更新分享訂單列表" ON shared_order_lists FOR UPDATE USING (true);
CREATE POLICY "所有用戶可刪除分享訂單列表" ON shared_order_lists FOR DELETE USING (true);

-- ============================================
-- 更新時間戳記觸發器
-- ============================================

-- 刪除舊觸發器（如果存在）
DROP TRIGGER IF EXISTS workspaces_updated_at ON workspaces;
DROP TRIGGER IF EXISTS channel_groups_updated_at ON channel_groups;
DROP TRIGGER IF EXISTS channels_updated_at ON channels;
DROP TRIGGER IF EXISTS messages_updated_at ON messages;
DROP TRIGGER IF EXISTS bulletins_updated_at ON bulletins;
DROP TRIGGER IF EXISTS advance_lists_updated_at ON advance_lists;
DROP TRIGGER IF EXISTS advance_items_updated_at ON advance_items;
DROP TRIGGER IF EXISTS shared_order_lists_updated_at ON shared_order_lists;

-- 建立觸發器（使用現有的 update_updated_at_column 函數）
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER channel_groups_updated_at BEFORE UPDATE ON channel_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER channels_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER bulletins_updated_at BEFORE UPDATE ON bulletins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER advance_lists_updated_at BEFORE UPDATE ON advance_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER advance_items_updated_at BEFORE UPDATE ON advance_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER shared_order_lists_updated_at BEFORE UPDATE ON shared_order_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成
-- ============================================

-- 驗證
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ Workspace 表結構更新完成！';
  RAISE NOTICE '====================================';
  RAISE NOTICE '已更新的表：';
  RAISE NOTICE '  - workspaces (添加離線同步欄位)';
  RAISE NOTICE '  - channels (添加 tour_id, group_id, 離線同步欄位)';
  RAISE NOTICE '  - messages (添加離線同步欄位)';
  RAISE NOTICE '  - bulletins (添加離線同步欄位)';
  RAISE NOTICE '已建立的表：';
  RAISE NOTICE '  - channel_groups';
  RAISE NOTICE '  - advance_lists';
  RAISE NOTICE '  - advance_items';
  RAISE NOTICE '  - shared_order_lists';
  RAISE NOTICE '====================================';
END $$;
