-- =====================================================
-- Venturo ERP - 提案系統 Migration
-- 檔案：20260105000000_create_proposal_system.sql
-- 日期：2026-01-05
--
-- 此 Migration 建立：
-- 1. proposals (提案)
-- 2. proposal_packages (團體套件)
-- 3. 修改 tours, quotes, itineraries 表
-- =====================================================

BEGIN;

-- ================================================
-- 1. proposals 表 (提案)
-- ================================================
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,              -- 提案編號：P000001

  -- 客戶資訊
  customer_id TEXT REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,

  -- 提案基本資訊
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,

  -- 目的地
  country_id TEXT,
  main_city_id TEXT,
  destination TEXT,

  -- 日期
  expected_start_date DATE,
  expected_end_date DATE,
  flexible_dates BOOLEAN DEFAULT false,

  -- 人數
  group_size INTEGER,
  participant_counts JSONB,               -- {adult, child_with_bed, child_no_bed, single_room, infant}

  -- 狀態
  status TEXT NOT NULL DEFAULT 'draft',   -- draft/negotiating/converted/archived

  -- 選定的套件與轉團
  selected_package_id UUID,               -- 最終選定的套件 ID
  converted_tour_id TEXT,                 -- 轉團後的 Tour ID
  converted_at TIMESTAMPTZ,
  converted_by TEXT,

  -- 審計
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 封存
  archived_at TIMESTAMPTZ,
  archive_reason TEXT,                    -- not_interested/competitor/price/date/other

  -- 同步欄位
  _deleted BOOLEAN DEFAULT false,
  _needs_sync BOOLEAN DEFAULT false,
  _synced_at TIMESTAMPTZ
);

-- proposals 索引
CREATE INDEX IF NOT EXISTS idx_proposals_workspace ON public.proposals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_proposals_customer ON public.proposals(customer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_expected_dates ON public.proposals(expected_start_date, expected_end_date);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_code ON public.proposals(code);

-- proposals 備註
COMMENT ON TABLE public.proposals IS '提案表 - 永遠草稿狀態，無團號，可有多個團體套件';
COMMENT ON COLUMN public.proposals.code IS '提案編號格式：P000001';
COMMENT ON COLUMN public.proposals.status IS 'draft=草稿, negotiating=洽談中, converted=已轉團, archived=封存';
COMMENT ON COLUMN public.proposals.selected_package_id IS '最終選定的套件ID，轉團時填入';

-- ================================================
-- 2. proposal_packages 表 (團體套件)
-- ================================================
CREATE TABLE IF NOT EXISTS public.proposal_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,

  -- 版本識別
  version_name TEXT NOT NULL,             -- 版本名稱（如：「方案A - 標準版」）
  version_number INTEGER NOT NULL,        -- 版本序號（1, 2, 3...）

  -- 目的地
  country_id TEXT,
  main_city_id TEXT,
  destination TEXT,

  -- 日期
  start_date DATE,
  end_date DATE,
  days INTEGER,
  nights INTEGER,

  -- 人數
  group_size INTEGER,
  participant_counts JSONB,

  -- 關聯資料（外鍵，分開存檔）
  quote_id TEXT,                          -- 關聯報價單
  itinerary_id TEXT,                      -- 關聯行程表
  handbook_id TEXT,                       -- 關聯手冊（未來擴展）

  -- 狀態
  is_selected BOOLEAN DEFAULT false,      -- 是否為最終選定版本
  is_active BOOLEAN DEFAULT true,

  -- 備註
  notes TEXT,

  -- 審計
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 複合唯一約束
  CONSTRAINT proposal_packages_version_unique UNIQUE (proposal_id, version_number)
);

-- proposal_packages 索引
CREATE INDEX IF NOT EXISTS idx_proposal_packages_proposal ON public.proposal_packages(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_packages_selected ON public.proposal_packages(proposal_id, is_selected) WHERE is_selected = true;
CREATE INDEX IF NOT EXISTS idx_proposal_packages_dates ON public.proposal_packages(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_proposal_packages_quote ON public.proposal_packages(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposal_packages_itinerary ON public.proposal_packages(itinerary_id) WHERE itinerary_id IS NOT NULL;

-- proposal_packages 備註
COMMENT ON TABLE public.proposal_packages IS '團體套件 - 報價單+行程表的綁定版本';
COMMENT ON COLUMN public.proposal_packages.version_name IS '版本名稱，如：方案A-標準版、方案B-豪華版';
COMMENT ON COLUMN public.proposal_packages.is_selected IS '是否為最終選定版本，轉團時使用';

-- ================================================
-- 3. 添加外鍵（proposals.selected_package_id）
-- ================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_selected_package_fkey'
  ) THEN
    ALTER TABLE public.proposals
    ADD CONSTRAINT proposals_selected_package_fkey
    FOREIGN KEY (selected_package_id) REFERENCES public.proposal_packages(id);
  END IF;
END $$;

-- ================================================
-- 4. 修改 quotes 表 - 新增 proposal_package_id
-- ================================================
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS proposal_package_id UUID REFERENCES public.proposal_packages(id);

CREATE INDEX IF NOT EXISTS idx_quotes_proposal_package ON public.quotes(proposal_package_id) WHERE proposal_package_id IS NOT NULL;

COMMENT ON COLUMN public.quotes.proposal_package_id IS '所屬團體套件ID（如果是從提案建立的）';

-- ================================================
-- 5. 修改 itineraries 表 - 新增 proposal_package_id
-- ================================================
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS proposal_package_id UUID REFERENCES public.proposal_packages(id);

CREATE INDEX IF NOT EXISTS idx_itineraries_proposal_package ON public.itineraries(proposal_package_id) WHERE proposal_package_id IS NOT NULL;

COMMENT ON COLUMN public.itineraries.proposal_package_id IS '所屬團體套件ID（如果是從提案建立的）';

-- ================================================
-- 6. 修改 tours 表 - 新增提案關聯欄位
-- ================================================
ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES public.proposals(id),
ADD COLUMN IF NOT EXISTS proposal_package_id UUID REFERENCES public.proposal_packages(id),
ADD COLUMN IF NOT EXISTS converted_from_proposal BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tours_proposal ON public.tours(proposal_id) WHERE proposal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tours_proposal_package ON public.tours(proposal_package_id) WHERE proposal_package_id IS NOT NULL;

COMMENT ON COLUMN public.tours.proposal_id IS '來源提案ID（如為轉團而來）';
COMMENT ON COLUMN public.tours.proposal_package_id IS '來源套件ID（轉團時選定的版本）';
COMMENT ON COLUMN public.tours.converted_from_proposal IS '是否從提案轉換而來';

-- ================================================
-- 7. RLS 政策 (Row Level Security)
-- ================================================

-- 啟用 RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_packages ENABLE ROW LEVEL SECURITY;

-- proposals RLS 政策（先刪除再建立，確保可重複執行）
DROP POLICY IF EXISTS "proposals_select" ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert" ON public.proposals;
DROP POLICY IF EXISTS "proposals_update" ON public.proposals;
DROP POLICY IF EXISTS "proposals_delete" ON public.proposals;

DROP POLICY IF EXISTS "proposals_select" ON public.proposals;
CREATE POLICY "proposals_select" ON public.proposals FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "proposals_insert" ON public.proposals;
CREATE POLICY "proposals_insert" ON public.proposals FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "proposals_update" ON public.proposals;
CREATE POLICY "proposals_update" ON public.proposals FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "proposals_delete" ON public.proposals;
CREATE POLICY "proposals_delete" ON public.proposals FOR DELETE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- proposal_packages RLS 政策（先刪除再建立）
DROP POLICY IF EXISTS "proposal_packages_select" ON public.proposal_packages;
DROP POLICY IF EXISTS "proposal_packages_insert" ON public.proposal_packages;
DROP POLICY IF EXISTS "proposal_packages_update" ON public.proposal_packages;
DROP POLICY IF EXISTS "proposal_packages_delete" ON public.proposal_packages;

DROP POLICY IF EXISTS "proposal_packages_select" ON public.proposal_packages;
CREATE POLICY "proposal_packages_select" ON public.proposal_packages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_id
    AND (p.workspace_id = get_current_user_workspace() OR is_super_admin())
  )
);

DROP POLICY IF EXISTS "proposal_packages_insert" ON public.proposal_packages;
CREATE POLICY "proposal_packages_insert" ON public.proposal_packages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_id
    AND p.workspace_id = get_current_user_workspace()
  )
);

DROP POLICY IF EXISTS "proposal_packages_update" ON public.proposal_packages;
CREATE POLICY "proposal_packages_update" ON public.proposal_packages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_id
    AND (p.workspace_id = get_current_user_workspace() OR is_super_admin())
  )
);

DROP POLICY IF EXISTS "proposal_packages_delete" ON public.proposal_packages;
CREATE POLICY "proposal_packages_delete" ON public.proposal_packages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_id
    AND (p.workspace_id = get_current_user_workspace() OR is_super_admin())
  )
);

COMMIT;
