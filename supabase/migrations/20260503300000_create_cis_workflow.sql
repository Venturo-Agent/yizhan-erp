-- ============================================================================
-- 20260503300000_create_cis_workflow.sql
--
-- CIS 工作流（漫途整合行銷專屬）— 客戶（旅行社）+ 拜訪紀錄
--
-- 對應 vault: brain/wiki/companies/venturo/service/cis/
--   - cis_clients = 漫途服務的旅行社客戶
--   - cis_visits  = 拜訪紀錄 + 五階段引導對話 + 品牌資料卡（jsonb）
--
-- 多租戶隔離：
--   - 表本身有 workspace_id、所有 row 都隔離
--   - sidebar 入口由 workspace_features('cis') 控制
--   - 只 grant feature + capability 給 VENTURO workspace
--   - 既有 ModuleGuard 自動處理（不買 feature → 路由 redirect /unauthorized）
--
-- 純加法 migration、不動既有表 / 資料。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. cis_clients：漫途服務的客戶（多為旅行社）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cis_clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  company_name  TEXT NOT NULL,
  contact_name  TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  travel_types  TEXT[] NOT NULL DEFAULT '{}',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'lead'
    CHECK (status IN ('lead', 'active', 'closed')),
  notes         TEXT,
  created_by    UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cis_clients_workspace_created
  ON public.cis_clients (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cis_clients_workspace_status
  ON public.cis_clients (workspace_id, status);

ALTER TABLE public.cis_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cis_clients_select" ON public.cis_clients
  FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "cis_clients_insert" ON public.cis_clients
  FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "cis_clients_update" ON public.cis_clients
  FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "cis_clients_delete" ON public.cis_clients
  FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "cis_clients_service" ON public.cis_clients
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.cis_clients IS
  'CIS 工作流客戶（漫途服務的旅行社）。對應 vault wiki/companies/venturo/service/cis/B_CIS服務戰略.md';

COMMENT ON COLUMN public.cis_clients.code IS
  '客戶編號、漫途自編、譬如 V2026-001。workspace 內唯一。';

COMMENT ON COLUMN public.cis_clients.travel_types IS
  '旅遊類型 tags：親子 / 銀髮 / 商務 / 國內 / 國外 etc';

COMMENT ON COLUMN public.cis_clients.status IS
  'lead = 線索 / active = 進行中 / closed = 結案';

-- ----------------------------------------------------------------------------
-- 2. cis_visits：拜訪紀錄 + 五階段品牌資料卡
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cis_visits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES public.cis_clients(id) ON DELETE CASCADE,
  visited_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  stage         TEXT NOT NULL DEFAULT 'discovery'
    CHECK (stage IN ('discovery', 'audit', 'positioning', 'design', 'rollout')),
  summary       TEXT,
  brand_card    JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio_url     TEXT,
  created_by    UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cis_visits_client_visited
  ON public.cis_visits (client_id, visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_cis_visits_workspace_created
  ON public.cis_visits (workspace_id, created_at DESC);

ALTER TABLE public.cis_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cis_visits_select" ON public.cis_visits
  FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "cis_visits_insert" ON public.cis_visits
  FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "cis_visits_update" ON public.cis_visits
  FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "cis_visits_delete" ON public.cis_visits
  FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "cis_visits_service" ON public.cis_visits
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.cis_visits IS
  '拜訪紀錄 + 五階段引導對話結果。對應 vault wiki/companies/venturo/service/cis/A_CIS主工作流.md 第六章「品牌資料卡」schema';

COMMENT ON COLUMN public.cis_visits.stage IS
  'CIS 七階段（簡化為五）：discovery 發現 / audit 稽核 / positioning 定位 / design 設計 / rollout 展開';

COMMENT ON COLUMN public.cis_visits.brand_card IS
  '品牌資料卡 JSON。建議 schema：
   {
     "travel_types": ["親子","國內"],
     "brand_keywords": ["溫暖","耐心"],
     "emotional_keywords": ["安心","家庭感"],
     "value_proposition": "讓爸媽放心、孩子開心",
     "touchpoints": ["官網","報價單","行程手冊"],
     "priority_needs": {
       "must_do": ["報價單套版","行程手冊"],
       "suggested": ["Logo優化"],
       "optional": ["官網UI"]
     },
     "visual_hints": { "color_tone": "暖色系", "style": "親切手繪" }
   }';

-- ----------------------------------------------------------------------------
-- 3. updated_at trigger（沿用 venturo-erp 既有 helper）
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'CREATE TRIGGER trg_cis_clients_updated_at
             BEFORE UPDATE ON public.cis_clients
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
    EXECUTE 'CREATE TRIGGER trg_cis_visits_updated_at
             BEFORE UPDATE ON public.cis_visits
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Grant 'cis' feature 給 VENTURO workspace
--    + capability 給漫途「平台主管」role
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_venturo_workspace_id UUID;
BEGIN
  SELECT id INTO v_venturo_workspace_id FROM public.workspaces WHERE code = 'VENTURO' LIMIT 1;

  IF v_venturo_workspace_id IS NULL THEN
    RAISE NOTICE 'VENTURO workspace 不存在、跳過 grant（可能還沒跑 20260503070000）';
    RETURN;
  END IF;

  -- 4(a) workspace_features INSERT cis
  INSERT INTO public.workspace_features (workspace_id, feature_code, enabled)
  VALUES (v_venturo_workspace_id, 'cis', true)
  ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = true;

  -- 4(b) capability INSERT 給漫途所有 role（admin role 才會有用、但加全部省得後續忘記）
  INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
  SELECT r.id, c.code, true
  FROM public.workspace_roles r
  CROSS JOIN (VALUES
    ('cis.clients.read'),
    ('cis.clients.write'),
    ('cis.visits.read'),
    ('cis.visits.write')
  ) AS c(code)
  WHERE r.workspace_id = v_venturo_workspace_id
    AND r.is_admin = true
  ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;

  RAISE NOTICE '✅ CIS feature granted to VENTURO workspace (%)', v_venturo_workspace_id;
END $$;
