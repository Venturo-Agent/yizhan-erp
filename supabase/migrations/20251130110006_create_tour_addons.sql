-- 建立團體加購項目表
BEGIN;

CREATE TABLE IF NOT EXISTS public.tour_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id),
  tour_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'TWD',
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,
  available_quantity INTEGER,
  deadline DATE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  _needs_sync BOOLEAN DEFAULT FALSE,
  _synced_at TIMESTAMPTZ,
  _deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_tour_addons_tour_id ON public.tour_addons(tour_id);
ALTER TABLE public.tour_addons DISABLE ROW LEVEL SECURITY;

COMMIT;
