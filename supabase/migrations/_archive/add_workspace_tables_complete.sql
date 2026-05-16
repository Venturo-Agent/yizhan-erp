-- ============================================
-- Workspace 工作空間系統資料表（完整修正版）
-- ============================================
-- 建立日期：2025-01-22
-- 說明：支援工作空間、頻道、訊息、代墊清單等功能
-- 修正：處理所有已存在的表，逐步添加缺少的欄位
-- ============================================

-- ============================================
-- 1. Workspaces 工作空間表
-- ============================================

-- 建立表（如果不存在）
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加所有可能缺少的欄位
DO $$
BEGIN
  -- 基本欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'description') THEN
    ALTER TABLE workspaces ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'icon') THEN
    ALTER TABLE workspaces ADD COLUMN icon VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'is_active') THEN
    ALTER TABLE workspaces ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'created_by') THEN
    ALTER TABLE workspaces ADD COLUMN created_by UUID REFERENCES users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'updated_at') THEN
    ALTER TABLE workspaces ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- 離線同步欄位
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
CREATE INDEX IF NOT EXISTS idx_workspaces_is_active ON workspaces(is_active);
CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);
CREATE INDEX IF NOT EXISTS idx_workspaces_needs_sync ON workspaces(_needs_sync) WHERE _needs_sync = true;

-- ============================================
-- 2. Channel Groups 頻道群組表
-- ============================================
CREATE TABLE IF NOT EXISTS channel_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加可能缺少的欄位
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel_groups' AND column_name = 'is_collapsed') THEN
    ALTER TABLE channel_groups ADD COLUMN is_collapsed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel_groups' AND column_name = 'order') THEN
    ALTER TABLE channel_groups ADD COLUMN "order" INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel_groups' AND column_name = 'updated_at') THEN
    ALTER TABLE channel_groups ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel_groups' AND column_name = '_needs_sync') THEN
    ALTER TABLE channel_groups ADD COLUMN _needs_sync BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel_groups' AND column_name = '_synced_at') THEN
    ALTER TABLE channel_groups ADD COLUMN _synced_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel_groups' AND column_name = '_deleted') THEN
    ALTER TABLE channel_groups ADD COLUMN _deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_channel_groups_workspace ON channel_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channel_groups_order ON channel_groups("order");

-- ============================================
-- 3. Channels 頻道表
-- ============================================
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加可能缺少的欄位
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'description') THEN
    ALTER TABLE channels ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'type') THEN
    ALTER TABLE channels ADD COLUMN type VARCHAR(20) DEFAULT 'public' CHECK (type IN ('public', 'private', 'direct'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'group_id') THEN
    ALTER TABLE channels ADD COLUMN group_id UUID REFERENCES channel_groups(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'tour_id') THEN
    ALTER TABLE channels ADD COLUMN tour_id TEXT REFERENCES tours(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'is_favorite') THEN
    ALTER TABLE channels ADD COLUMN is_favorite BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'created_by') THEN
    ALTER TABLE channels ADD COLUMN created_by UUID REFERENCES users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'updated_at') THEN
    ALTER TABLE channels ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

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
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channels_group ON channels(group_id);
CREATE INDEX IF NOT EXISTS idx_channels_tour ON channels(tour_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_favorite ON channels(is_favorite) WHERE is_favorite = true;

-- ============================================
-- 4. Messages 訊息表
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加可能缺少的欄位
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'reactions') THEN
    ALTER TABLE messages ADD COLUMN reactions JSONB DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'attachments') THEN
    ALTER TABLE messages ADD COLUMN attachments JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'updated_at') THEN
    ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'edited_at') THEN
    ALTER TABLE messages ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
  END IF;

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

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================
-- 5. Bulletins 公告表
-- ============================================
CREATE TABLE IF NOT EXISTS bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加可能缺少的欄位
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bulletins' AND column_name = 'type') THEN
    ALTER TABLE bulletins ADD COLUMN type VARCHAR(20) DEFAULT 'notice' CHECK (type IN ('announcement', 'notice', 'event'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bulletins' AND column_name = 'priority') THEN
    ALTER TABLE bulletins ADD COLUMN priority INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bulletins' AND column_name = 'is_pinned') THEN
    ALTER TABLE bulletins ADD COLUMN is_pinned BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bulletins' AND column_name = 'updated_at') THEN
    ALTER TABLE bulletins ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

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

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_bulletins_workspace ON bulletins(workspace_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_author ON bulletins(author_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_type ON bulletins(type);
CREATE INDEX IF NOT EXISTS idx_bulletins_pinned ON bulletins(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_bulletins_created_at ON bulletins(created_at DESC);

-- ============================================
-- 6. Advance Lists 代墊清單表
-- ============================================
CREATE TABLE IF NOT EXISTS advance_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加可能缺少的欄位
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_lists' AND column_name = 'updated_at') THEN
    ALTER TABLE advance_lists ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_lists' AND column_name = '_needs_sync') THEN
    ALTER TABLE advance_lists ADD COLUMN _needs_sync BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_lists' AND column_name = '_synced_at') THEN
    ALTER TABLE advance_lists ADD COLUMN _synced_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_lists' AND column_name = '_deleted') THEN
    ALTER TABLE advance_lists ADD COLUMN _deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_advance_lists_channel ON advance_lists(channel_id);
CREATE INDEX IF NOT EXISTS idx_advance_lists_created_by ON advance_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_advance_lists_created_at ON advance_lists(created_at DESC);

-- ============================================
-- 7. Advance Items 代墊項目表
-- ============================================
CREATE TABLE IF NOT EXISTS advance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_list_id UUID NOT NULL REFERENCES advance_lists(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  advance_person VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加可能缺少的欄位
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_items' AND column_name = 'description') THEN
    ALTER TABLE advance_items ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_items' AND column_name = 'status') THEN
    ALTER TABLE advance_items ADD COLUMN status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_items' AND column_name = 'payment_request_id') THEN
    ALTER TABLE advance_items ADD COLUMN payment_request_id UUID REFERENCES payment_requests(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_items' AND column_name = 'processed_by') THEN
    ALTER TABLE advance_items ADD COLUMN processed_by UUID REFERENCES users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_items' AND column_name = 'processed_at') THEN
    ALTER TABLE advance_items ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_items' AND column_name = 'updated_at') THEN
    ALTER TABLE advance_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_items' AND column_name = '_needs_sync') THEN
    ALTER TABLE advance_items ADD COLUMN _needs_sync BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_items' AND column_name = '_synced_at') THEN
    ALTER TABLE advance_items ADD COLUMN _synced_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_items' AND column_name = '_deleted') THEN
    ALTER TABLE advance_items ADD COLUMN _deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_advance_items_list ON advance_items(advance_list_id);
CREATE INDEX IF NOT EXISTS idx_advance_items_status ON advance_items(status);
CREATE INDEX IF NOT EXISTS idx_advance_items_payment_request ON advance_items(payment_request_id);

-- ============================================
-- 8. Shared Order Lists 分享訂單列表表
-- ============================================
CREATE TABLE IF NOT EXISTS shared_order_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  order_ids JSONB NOT NULL DEFAULT '[]',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加可能缺少的欄位
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shared_order_lists' AND column_name = 'updated_at') THEN
    ALTER TABLE shared_order_lists ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shared_order_lists' AND column_name = '_needs_sync') THEN
    ALTER TABLE shared_order_lists ADD COLUMN _needs_sync BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shared_order_lists' AND column_name = '_synced_at') THEN
    ALTER TABLE shared_order_lists ADD COLUMN _synced_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shared_order_lists' AND column_name = '_deleted') THEN
    ALTER TABLE shared_order_lists ADD COLUMN _deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_shared_order_lists_channel ON shared_order_lists(channel_id);
CREATE INDEX IF NOT EXISTS idx_shared_order_lists_created_by ON shared_order_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_shared_order_lists_created_at ON shared_order_lists(created_at DESC);

-- ============================================
-- Row Level Security (RLS) 政策
-- ============================================

-- 啟用 RLS
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
DROP POLICY IF EXISTS "管理員可管理工作空間" ON workspaces;
DROP POLICY IF EXISTS "所有用戶可讀取頻道" ON channels;
DROP POLICY IF EXISTS "所有用戶可建立頻道" ON channels;
DROP POLICY IF EXISTS "所有用戶可更新頻道" ON channels;
DROP POLICY IF EXISTS "所有用戶可刪除頻道" ON channels;
DROP POLICY IF EXISTS "所有用戶可讀取頻道群組" ON channel_groups;
DROP POLICY IF EXISTS "所有用戶可建立頻道群組" ON channel_groups;
DROP POLICY IF EXISTS "所有用戶可更新頻道群組" ON channel_groups;
DROP POLICY IF EXISTS "所有用戶可刪除頻道群組" ON channel_groups;
DROP POLICY IF EXISTS "所有用戶可讀取訊息" ON messages;
DROP POLICY IF EXISTS "所有用戶可建立訊息" ON messages;
DROP POLICY IF EXISTS "作者可更新訊息" ON messages;
DROP POLICY IF EXISTS "作者可刪除訊息" ON messages;
DROP POLICY IF EXISTS "所有用戶可讀取公告" ON bulletins;
DROP POLICY IF EXISTS "所有用戶可建立公告" ON bulletins;
DROP POLICY IF EXISTS "作者或管理員可更新公告" ON bulletins;
DROP POLICY IF EXISTS "作者或管理員可刪除公告" ON bulletins;
DROP POLICY IF EXISTS "所有用戶可讀取代墊清單" ON advance_lists;
DROP POLICY IF EXISTS "所有用戶可建立代墊清單" ON advance_lists;
DROP POLICY IF EXISTS "作者可更新代墊清單" ON advance_lists;
DROP POLICY IF EXISTS "作者可刪除代墊清單" ON advance_lists;
DROP POLICY IF EXISTS "所有用戶可讀取代墊項目" ON advance_items;
DROP POLICY IF EXISTS "所有用戶可建立代墊項目" ON advance_items;
DROP POLICY IF EXISTS "所有用戶可更新代墊項目" ON advance_items;
DROP POLICY IF EXISTS "所有用戶可刪除代墊項目" ON advance_items;
DROP POLICY IF EXISTS "所有用戶可讀取分享訂單列表" ON shared_order_lists;
DROP POLICY IF EXISTS "所有用戶可建立分享訂單列表" ON shared_order_lists;
DROP POLICY IF EXISTS "作者可更新分享訂單列表" ON shared_order_lists;
DROP POLICY IF EXISTS "作者可刪除分享訂單列表" ON shared_order_lists;

-- Workspaces 政策：所有登入用戶可讀，只有管理員可寫
CREATE POLICY "所有用戶可讀取工作空間" ON workspaces FOR SELECT USING (true);
CREATE POLICY "管理員可管理工作空間" ON workspaces FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND 'admin' = ANY(users.roles))
);

-- Channels 政策：所有登入用戶可讀寫
CREATE POLICY "所有用戶可讀取頻道" ON channels FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立頻道" ON channels FOR INSERT WITH CHECK (true);
CREATE POLICY "所有用戶可更新頻道" ON channels FOR UPDATE USING (true);
CREATE POLICY "所有用戶可刪除頻道" ON channels FOR DELETE USING (true);

-- Channel Groups 政策：所有登入用戶可讀寫
CREATE POLICY "所有用戶可讀取頻道群組" ON channel_groups FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立頻道群組" ON channel_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "所有用戶可更新頻道群組" ON channel_groups FOR UPDATE USING (true);
CREATE POLICY "所有用戶可刪除頻道群組" ON channel_groups FOR DELETE USING (true);

-- Messages 政策：所有登入用戶可讀寫
CREATE POLICY "所有用戶可讀取訊息" ON messages FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立訊息" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "作者可更新訊息" ON messages FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "作者可刪除訊息" ON messages FOR DELETE USING (author_id = auth.uid());

-- Bulletins 政策：所有用戶可讀，只有作者或管理員可寫
CREATE POLICY "所有用戶可讀取公告" ON bulletins FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立公告" ON bulletins FOR INSERT WITH CHECK (true);
CREATE POLICY "作者或管理員可更新公告" ON bulletins FOR UPDATE USING (
  author_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND 'admin' = ANY(users.roles))
);
CREATE POLICY "作者或管理員可刪除公告" ON bulletins FOR DELETE USING (
  author_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND 'admin' = ANY(users.roles))
);

-- Advance Lists & Items 政策：所有登入用戶可讀寫
CREATE POLICY "所有用戶可讀取代墊清單" ON advance_lists FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立代墊清單" ON advance_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "作者可更新代墊清單" ON advance_lists FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "作者可刪除代墊清單" ON advance_lists FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "所有用戶可讀取代墊項目" ON advance_items FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立代墊項目" ON advance_items FOR INSERT WITH CHECK (true);
CREATE POLICY "所有用戶可更新代墊項目" ON advance_items FOR UPDATE USING (true);
CREATE POLICY "所有用戶可刪除代墊項目" ON advance_items FOR DELETE USING (true);

-- Shared Order Lists 政策：所有登入用戶可讀寫
CREATE POLICY "所有用戶可讀取分享訂單列表" ON shared_order_lists FOR SELECT USING (true);
CREATE POLICY "所有用戶可建立分享訂單列表" ON shared_order_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "作者可更新分享訂單列表" ON shared_order_lists FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "作者可刪除分享訂單列表" ON shared_order_lists FOR DELETE USING (created_by = auth.uid());

-- ============================================
-- 更新時間戳記觸發器
-- ============================================

CREATE OR REPLACE FUNCTION update_workspace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 刪除舊觸發器（如果存在）
DROP TRIGGER IF EXISTS workspaces_updated_at ON workspaces;
DROP TRIGGER IF EXISTS channel_groups_updated_at ON channel_groups;
DROP TRIGGER IF EXISTS channels_updated_at ON channels;
DROP TRIGGER IF EXISTS messages_updated_at ON messages;
DROP TRIGGER IF EXISTS bulletins_updated_at ON bulletins;
DROP TRIGGER IF EXISTS advance_lists_updated_at ON advance_lists;
DROP TRIGGER IF EXISTS advance_items_updated_at ON advance_items;
DROP TRIGGER IF EXISTS shared_order_lists_updated_at ON shared_order_lists;

-- 建立觸發器
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_workspace_timestamp();

CREATE TRIGGER channel_groups_updated_at BEFORE UPDATE ON channel_groups
  FOR EACH ROW EXECUTE FUNCTION update_workspace_timestamp();

CREATE TRIGGER channels_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_workspace_timestamp();

CREATE TRIGGER messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_workspace_timestamp();

CREATE TRIGGER bulletins_updated_at BEFORE UPDATE ON bulletins
  FOR EACH ROW EXECUTE FUNCTION update_workspace_timestamp();

CREATE TRIGGER advance_lists_updated_at BEFORE UPDATE ON advance_lists
  FOR EACH ROW EXECUTE FUNCTION update_workspace_timestamp();

CREATE TRIGGER advance_items_updated_at BEFORE UPDATE ON advance_items
  FOR EACH ROW EXECUTE FUNCTION update_workspace_timestamp();

CREATE TRIGGER shared_order_lists_updated_at BEFORE UPDATE ON shared_order_lists
  FOR EACH ROW EXECUTE FUNCTION update_workspace_timestamp();

-- ============================================
-- 插入預設工作空間
-- ============================================

INSERT INTO workspaces (name, description, icon, is_active)
VALUES ('總部辦公室', 'Venturo 總部工作空間', '🏢', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 完成
-- ============================================
