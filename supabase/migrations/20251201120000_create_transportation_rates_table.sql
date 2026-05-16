-- Create transportation_rates table for managing vehicle rental prices
BEGIN;

-- ============================================================================
-- Drop existing table if it exists (migration fix)
-- ============================================================================
DROP TABLE IF EXISTS public.transportation_rates CASCADE;

-- ============================================================================
-- Create transportation_rates table
-- ============================================================================
CREATE TABLE public.transportation_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- 基本資訊
  country_id TEXT REFERENCES public.countries(id) ON DELETE SET NULL,
  country_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,

  -- 詳細分類
  category TEXT,              -- 品項大分類（如：4座車、7座車）
  supplier TEXT,              -- 廠商名稱
  route TEXT,                 -- 行程路線
  trip_type TEXT,             -- 行程類型（單程、往返）

  -- 價格資訊
  cost_vnd NUMERIC(15, 2),    -- 成本價（越南盾）
  price_twd NUMERIC(15, 2),   -- 售價（台幣）
  price NUMERIC(15, 2) NOT NULL DEFAULT 0,  -- 主要價格
  currency TEXT NOT NULL DEFAULT 'TWD',
  unit TEXT NOT NULL DEFAULT 'trip',

  -- KKDAY 相關
  kkday_selling_price NUMERIC(15, 2),  -- KKDAY售價
  kkday_cost NUMERIC(15, 2),           -- KKDAY成本
  kkday_profit NUMERIC(15, 2),         -- KKDAY利潤

  -- 狀態與備註
  is_backup BOOLEAN DEFAULT false,     -- 是否為備用廠商
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,

  -- Soft delete
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  deleted_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,

  CONSTRAINT transportation_rates_price_positive CHECK (price >= 0)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_transportation_rates_workspace ON public.transportation_rates(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transportation_rates_country ON public.transportation_rates(country_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transportation_rates_vehicle_type ON public.transportation_rates(vehicle_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transportation_rates_category ON public.transportation_rates(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transportation_rates_active ON public.transportation_rates(is_active) WHERE deleted_at IS NULL;

-- ============================================================================
-- Enable RLS (Row Level Security)
-- ============================================================================
ALTER TABLE public.transportation_rates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Policy: Users can only see their own workspace's transportation rates
CREATE POLICY "Users can view their workspace transportation_rates"
  ON public.transportation_rates
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert transportation rates in their workspace
CREATE POLICY "Users can insert their workspace transportation_rates"
  ON public.transportation_rates
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE id = auth.uid()
    )
  );

-- Policy: Users can update transportation rates in their workspace
CREATE POLICY "Users can update their workspace transportation_rates"
  ON public.transportation_rates
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE id = auth.uid()
    )
  );

-- Policy: Users can soft delete transportation rates in their workspace
CREATE POLICY "Users can delete their workspace transportation_rates"
  ON public.transportation_rates
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.employees WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE TRIGGER set_transportation_rates_updated_at
  BEFORE UPDATE ON public.transportation_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE public.transportation_rates IS 'Stores transportation/vehicle rental pricing information';
COMMENT ON COLUMN public.transportation_rates.country_id IS 'Reference to countries table (optional)';
COMMENT ON COLUMN public.transportation_rates.country_name IS 'Country name for display';
COMMENT ON COLUMN public.transportation_rates.vehicle_type IS 'Type of vehicle (e.g., sedan, van, bus)';
COMMENT ON COLUMN public.transportation_rates.category IS 'Vehicle category (e.g., 4座車, 7座車)';
COMMENT ON COLUMN public.transportation_rates.supplier IS 'Supplier/vendor name';
COMMENT ON COLUMN public.transportation_rates.route IS 'Route description';
COMMENT ON COLUMN public.transportation_rates.trip_type IS 'Trip type (one-way, round-trip)';
COMMENT ON COLUMN public.transportation_rates.is_backup IS 'Whether this is a backup supplier';
COMMENT ON COLUMN public.transportation_rates.display_order IS 'Order for display sorting';

COMMIT;
