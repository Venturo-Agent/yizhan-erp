-- ============================================================================
-- 20260503320000_create_cis_pricing_items.sql
--
-- CIS 衍生項目價目表（漫途的「商品 / 服務 SKU」）
-- 對應 vault B 第四章「旅遊業 CIS 衍生項目清單」
--
-- 用途：
--   1. 拜訪結束後、把 brand_card.priority_needs 對應到價目項目、自動產出報價草案
--   2. 之後可以接 ERP 既有報價單 / 訂單系統
--
-- 純加法 migration、含 seed 給 VENTURO workspace（純 INSERT、不影響其他資料）
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cis_pricing_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('identity', 'print', 'digital', 'physical', 'uniform', 'other')),
  name            TEXT NOT NULL,
  description     TEXT,
  unit            TEXT NOT NULL DEFAULT '式',
  price_low       NUMERIC(10,2),
  price_high      NUMERIC(10,2),
  match_keywords  TEXT[] NOT NULL DEFAULT '{}',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  created_by      UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cis_pricing_items_workspace_active
  ON public.cis_pricing_items (workspace_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_cis_pricing_items_category
  ON public.cis_pricing_items (workspace_id, category) WHERE is_active = true;

ALTER TABLE public.cis_pricing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cis_pricing_items_select" ON public.cis_pricing_items
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "cis_pricing_items_insert" ON public.cis_pricing_items
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "cis_pricing_items_update" ON public.cis_pricing_items
  FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "cis_pricing_items_delete" ON public.cis_pricing_items
  FOR DELETE USING (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "cis_pricing_items_service" ON public.cis_pricing_items
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.cis_pricing_items IS
  'CIS 衍生項目價目表（漫途自編）。對應 vault wiki/companies/venturo/service/cis/B_CIS服務戰略.md 第四章';
COMMENT ON COLUMN public.cis_pricing_items.match_keywords IS
  '從 brand_card.priority_needs 自動 match 的關鍵詞、譬如 ["logo","識別"] 對應 Logo 優化';
COMMENT ON COLUMN public.cis_pricing_items.category IS
  'identity=識別 / print=印刷 / digital=數位 / physical=實體 / uniform=制服 / other';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'CREATE TRIGGER trg_cis_pricing_items_updated_at
             BEFORE UPDATE ON public.cis_pricing_items
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 加 capability + seed VENTURO workspace 的價目表（10 個常見項目）
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_venturo_workspace_id UUID;
BEGIN
  SELECT id INTO v_venturo_workspace_id FROM public.workspaces WHERE code = 'VENTURO' LIMIT 1;
  IF v_venturo_workspace_id IS NULL THEN
    RAISE NOTICE 'VENTURO workspace 不存在、跳過 seed';
    RETURN;
  END IF;

  -- 加 capability
  INSERT INTO public.role_capabilities (role_id, capability_code, enabled)
  SELECT r.id, c.code, true
  FROM public.workspace_roles r
  CROSS JOIN (VALUES
    ('cis.pricing.read'),
    ('cis.pricing.write')
  ) AS c(code)
  WHERE r.workspace_id = v_venturo_workspace_id AND r.is_admin = true
  ON CONFLICT (role_id, capability_code) DO UPDATE SET enabled = true;

  -- Seed 10 個常見項目（取自 vault B 第四章）
  INSERT INTO public.cis_pricing_items
    (workspace_id, code, category, name, description, unit, price_low, price_high, match_keywords, sort_order)
  VALUES
    (v_venturo_workspace_id, 'IDN-001', 'identity', 'Logo 優化／重設計', '既有 Logo 優化或全新設計、含品牌色與字型規範', '式', 15000, 35000,
      ARRAY['logo','識別','標誌','品牌'], 10),
    (v_venturo_workspace_id, 'IDN-002', 'identity', 'CIS 設計手冊', '完整 MI/BI/VI 識別系統手冊（PDF）', '式', 25000, 60000,
      ARRAY['cis','手冊','規範','識別'], 20),
    (v_venturo_workspace_id, 'PRT-001', 'print', '報價單／確認單模板', 'ERP 可套版的報價單模板（含品牌色帶入）', '套', 5000, 12000,
      ARRAY['報價單','確認單','模板','套版'], 30),
    (v_venturo_workspace_id, 'PRT-002', 'print', '行程手冊（口袋本）', '行程手冊設計、客製化封面、內頁地圖插畫', '式', 15000, 30000,
      ARRAY['行程','手冊','口袋本','行程手冊'], 40),
    (v_venturo_workspace_id, 'PRT-003', 'print', '名片設計', '雙面名片設計、含 QR Code', '式', 3000, 6000,
      ARRAY['名片','business card'], 50),
    (v_venturo_workspace_id, 'PHY-001', 'physical', '行李吊牌（500 個）', '防水材質、可填寫姓名電話、品牌色底', '批', 3000, 8000,
      ARRAY['行李','吊牌','luggage'], 60),
    (v_venturo_workspace_id, 'PHY-002', 'physical', '出團包（提袋）', '輕量防水、可折疊、印品牌 Logo（500 個起訂）', '批', 25000, 60000,
      ARRAY['出團包','提袋','包包','袋'], 70),
    (v_venturo_workspace_id, 'PHY-003', 'physical', '領隊旗', '伸縮旗桿、抗風材質、雙面印刷', '組', 2000, 4500,
      ARRAY['領隊','旗子','旗','flag'], 80),
    (v_venturo_workspace_id, 'UNI-001', 'uniform', '領隊制服（Polo / 背心）', '品牌色、快乾材質', '套', 1500, 3500,
      ARRAY['制服','uniform','polo','背心'], 90),
    (v_venturo_workspace_id, 'DIG-001', 'digital', '社群素材模板', 'FB/IG/LINE 封面 + 限時動態貼圖組', '式', 8000, 20000,
      ARRAY['社群','social','模板','貼文','貼圖'], 100),
    (v_venturo_workspace_id, 'DIG-002', 'digital', '官網／APP UI 優化', '前端視覺優化、套版品牌規範', '式', 30000, 100000,
      ARRAY['官網','website','app','ui','介面'], 110),
    (v_venturo_workspace_id, 'DIG-003', 'digital', 'EDM 模板', '電子報模板（行前 / 行後 / 促銷三套）', '套', 6000, 15000,
      ARRAY['edm','電子報','newsletter'], 120)
  ON CONFLICT (workspace_id, code) DO NOTHING;

  RAISE NOTICE 'CIS pricing items seeded for VENTURO';
END $$;
