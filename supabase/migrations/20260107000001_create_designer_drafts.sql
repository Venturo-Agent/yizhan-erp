-- Designer Drafts Table
-- 儲存手冊設計器的草稿資料

BEGIN;

CREATE TABLE IF NOT EXISTS public.designer_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 關聯來源（只會有一個）
  tour_id text REFERENCES public.tours(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE CASCADE,
  itinerary_id text REFERENCES public.itineraries(id) ON DELETE CASCADE,

  -- 草稿名稱
  name text NOT NULL DEFAULT '未命名草稿',

  -- 草稿資料（JSON）
  style_id text NOT NULL,
  template_data jsonb NOT NULL DEFAULT '{}',
  trip_days integer NOT NULL DEFAULT 3,
  memo_settings jsonb,
  hotels jsonb DEFAULT '[]',
  attractions jsonb DEFAULT '[]',
  country_code text DEFAULT 'JP',

  -- 手動編輯的元素（保留使用者在畫布上的修改）
  edited_elements jsonb DEFAULT '{}',

  -- 時間戳
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_designer_drafts_workspace ON public.designer_drafts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_designer_drafts_user ON public.designer_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_designer_drafts_tour ON public.designer_drafts(tour_id);
CREATE INDEX IF NOT EXISTS idx_designer_drafts_proposal ON public.designer_drafts(proposal_id);
CREATE INDEX IF NOT EXISTS idx_designer_drafts_itinerary ON public.designer_drafts(itinerary_id);

-- 每個來源只能有一個草稿（UNIQUE constraint）
CREATE UNIQUE INDEX IF NOT EXISTS idx_designer_drafts_tour_unique ON public.designer_drafts(tour_id) WHERE tour_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_designer_drafts_proposal_unique ON public.designer_drafts(proposal_id) WHERE proposal_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_designer_drafts_itinerary_unique ON public.designer_drafts(itinerary_id) WHERE itinerary_id IS NOT NULL;

-- 啟用 RLS
ALTER TABLE public.designer_drafts ENABLE ROW LEVEL SECURITY;

-- RLS 策略
DROP POLICY IF EXISTS "designer_drafts_select" ON public.designer_drafts;
CREATE POLICY "designer_drafts_select" ON public.designer_drafts FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "designer_drafts_insert" ON public.designer_drafts;
CREATE POLICY "designer_drafts_insert" ON public.designer_drafts FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "designer_drafts_update" ON public.designer_drafts;
CREATE POLICY "designer_drafts_update" ON public.designer_drafts FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "designer_drafts_delete" ON public.designer_drafts;
CREATE POLICY "designer_drafts_delete" ON public.designer_drafts FOR DELETE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 更新時間觸發器
CREATE OR REPLACE FUNCTION update_designer_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_designer_drafts_updated_at ON public.designer_drafts;
DROP TRIGGER IF EXISTS trigger_designer_drafts_updated_at ON public.designer_drafts;
CREATE TRIGGER trigger_designer_drafts_updated_at
BEFORE UPDATE ON public.designer_drafts
FOR EACH ROW
EXECUTE FUNCTION update_designer_drafts_updated_at();

COMMENT ON TABLE public.designer_drafts IS '手冊設計器草稿';
COMMENT ON COLUMN public.designer_drafts.edited_elements IS '使用者手動編輯的元素，格式: { "pageType-elementId": { ...element data } }';

COMMIT;
