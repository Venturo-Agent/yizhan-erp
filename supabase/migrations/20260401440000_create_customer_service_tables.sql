-- LINE/Messenger 客服對話記錄
CREATE TABLE IF NOT EXISTS customer_service_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 用戶資訊
  platform TEXT NOT NULL CHECK (platform IN ('line', 'messenger')),
  platform_user_id TEXT NOT NULL,
  user_display_name TEXT,
  
  -- 對話內容
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  
  -- 分析結果
  intent TEXT, -- '查詢行程' | '查詢價格' | '報名' | '其他'
  mentioned_tours TEXT[], -- ['CNX260524A']
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  
  -- 商機追蹤
  is_potential_lead BOOLEAN DEFAULT false,
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  
  -- 時間戳
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 索引
  CONSTRAINT unique_conversation UNIQUE (platform, platform_user_id, user_message, created_at)
);

-- 潛在客戶
CREATE TABLE IF NOT EXISTS customer_service_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 用戶資訊
  platform TEXT NOT NULL CHECK (platform IN ('line', 'messenger')),
  platform_user_id TEXT NOT NULL,
  user_display_name TEXT,
  
  -- 興趣資訊
  interested_tours TEXT[], -- ['CNX260524A', 'NRT260601A']
  last_contact TIMESTAMP,
  total_messages INTEGER DEFAULT 1,
  
  -- 跟進狀態
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'lost')),
  assigned_to UUID REFERENCES employees(id),
  notes TEXT,
  
  -- 時間戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 唯一約束
  CONSTRAINT unique_lead UNIQUE (platform, platform_user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_conversations_platform_user ON customer_service_conversations(platform, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON customer_service_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_intent ON customer_service_conversations(intent);
CREATE INDEX IF NOT EXISTS idx_leads_platform_user ON customer_service_leads(platform, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON customer_service_leads(status);

-- 自動觸發器：高價值對話自動建立 lead
CREATE OR REPLACE FUNCTION auto_create_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果詢問價格或報名，自動建立潛在客戶
  IF NEW.intent IN ('查詢價格', '報名') THEN
    INSERT INTO customer_service_leads (
      platform,
      platform_user_id,
      user_display_name,
      interested_tours,
      last_contact,
      total_messages
    ) VALUES (
      NEW.platform,
      NEW.platform_user_id,
      NEW.user_display_name,
      NEW.mentioned_tours,
      NEW.created_at,
      1
    )
    ON CONFLICT (platform, platform_user_id) DO UPDATE
    SET 
      interested_tours = ARRAY(
        SELECT DISTINCT unnest(
          customer_service_leads.interested_tours || NEW.mentioned_tours
        )
      ),
      last_contact = NEW.created_at,
      total_messages = customer_service_leads.total_messages + 1,
      updated_at = NOW();
    
    -- 標記為潛在客戶
    NEW.is_potential_lead := true;
    NEW.lead_score := 80;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_lead_trigger ON customer_service_conversations;
CREATE TRIGGER auto_create_lead_trigger
BEFORE INSERT ON customer_service_conversations
FOR EACH ROW
EXECUTE FUNCTION auto_create_lead();
