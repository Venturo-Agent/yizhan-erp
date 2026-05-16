-- =============================================
-- 羅根 (Logan) - Venturo AI 助理的記憶系統
-- =============================================

-- AI 記憶表：存放羅根的所有記憶、知識、人格
CREATE TABLE IF NOT EXISTS ai_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),

  -- 分類
  category TEXT NOT NULL CHECK (category IN (
    -- 公司靈魂
    'company_culture',     -- 公司文化
    'philosophy',          -- 理念與價值觀
    'journey',             -- 心路歷程
    'why_we_do_this',      -- 為什麼這樣做

    -- 系統知識（員工導師用）
    'how_to',              -- 怎麼做某件事
    'where_is',            -- 東西在哪裡
    'workflow',            -- 流程順序
    'business_rule',       -- 業務規則
    'term_definition',     -- 名詞解釋

    -- 技術相關
    'tech_decision',       -- 技術決策
    'lesson_learned',      -- 踩過的坑

    -- 對話紀錄
    'conversation',        -- 重要對話

    -- 行為規範
    'dont_do',             -- 不要做的事
    'personality'          -- 人格特質
  )),

  -- 內容
  title TEXT,
  content TEXT NOT NULL,
  context TEXT,                    -- 當時的背景情境
  related_feature TEXT,            -- 相關功能模組

  -- 來源
  source TEXT DEFAULT 'manual' CHECK (source IN (
    'claude_chat',    -- 來自與 Claude 的對話
    'manual',         -- 手動輸入
    'observation',    -- 系統觀察
    'meeting'         -- 會議紀錄
  )),
  source_date DATE,                -- 這件事發生的時間

  -- 標籤與搜尋
  tags TEXT[],

  -- 情感與重要性
  emotion TEXT,                    -- 當時的心情（選填）
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),

  -- 標準欄位
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ai_memories_category ON ai_memories(category);
CREATE INDEX IF NOT EXISTS idx_ai_memories_workspace_id ON ai_memories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_memories_tags ON ai_memories USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ai_memories_importance ON ai_memories(importance DESC);
CREATE INDEX IF NOT EXISTS idx_ai_memories_created_at ON ai_memories(created_at DESC);

-- 全文搜尋索引
CREATE INDEX IF NOT EXISTS idx_ai_memories_content_search ON ai_memories
  USING GIN(to_tsvector('simple', coalesce(title, '') || ' ' || content));

-- RLS 禁用（只有超級管理員能存取）
ALTER TABLE ai_memories DISABLE ROW LEVEL SECURITY;

-- 更新時間觸發器
CREATE OR REPLACE FUNCTION update_ai_memories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_memories_updated_at ON ai_memories;
CREATE TRIGGER trigger_ai_memories_updated_at
  BEFORE UPDATE ON ai_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_memories_updated_at();

-- =============================================
-- 羅根的對話紀錄表
-- =============================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),

  -- 對話參與者
  employee_id UUID REFERENCES employees(id),

  -- 對話內容
  messages JSONB NOT NULL DEFAULT '[]',
  -- 格式: [{ role: 'user' | 'assistant', content: string, timestamp: string }]

  -- 對話摘要（羅根自己整理的）
  summary TEXT,

  -- 學到的東西（如果有）
  learned_memory_ids UUID[],

  -- 狀態
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  -- 標準欄位
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ai_conversations_employee_id ON ai_conversations(employee_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_workspace_id ON ai_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

-- RLS 禁用
ALTER TABLE ai_conversations DISABLE ROW LEVEL SECURITY;

-- 更新時間觸發器
DROP TRIGGER IF EXISTS trigger_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER trigger_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_memories_updated_at();

-- =============================================
-- 羅根的設定表
-- =============================================

CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),

  -- 基本設定
  name TEXT DEFAULT '羅根',
  avatar_url TEXT,

  -- AI Provider 設定
  provider TEXT DEFAULT 'ollama' CHECK (provider IN ('ollama', 'claude', 'openai')),
  model TEXT DEFAULT 'qwen2.5:7b',

  -- Ollama 設定
  ollama_base_url TEXT DEFAULT 'http://localhost:11434',

  -- API Keys（加密存儲）
  claude_api_key TEXT,
  openai_api_key TEXT,

  -- 人格設定
  system_prompt TEXT,
  temperature DECIMAL DEFAULT 0.7,

  -- 功能開關
  can_read_erp_data BOOLEAN DEFAULT true,
  can_learn_from_conversations BOOLEAN DEFAULT true,

  -- 標準欄位
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 禁用
ALTER TABLE ai_settings DISABLE ROW LEVEL SECURITY;

-- 插入預設設定（僅在 name 欄位存在時）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_settings' AND column_name='name') THEN
    INSERT INTO ai_settings (name, system_prompt) VALUES (
      '羅根',
      '你是羅根，Venturo 的 AI 助理。'
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMENT ON TABLE ai_memories IS '羅根的記憶庫：存放公司知識、文化、流程等';
COMMENT ON TABLE ai_conversations IS '羅根與員工的對話紀錄';
COMMENT ON TABLE ai_settings IS '羅根的設定檔';
