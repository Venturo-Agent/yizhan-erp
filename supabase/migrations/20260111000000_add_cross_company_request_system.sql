-- Migration: Cross-Company Request System
-- Description: Add workspace types, cross-company request/response system, and leader availability
-- Date: 2026-01-11

BEGIN;

-- ============================================
-- 1. Workspaces - Add type field
-- ============================================
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS type text DEFAULT 'travel_agency';

COMMENT ON COLUMN public.workspaces.type IS 'Workspace type: travel_agency, vehicle_supplier, guide_supplier';

-- ============================================
-- 2. Tour Requests - Add cross-company fields
-- ============================================
ALTER TABLE public.tour_requests
ADD COLUMN IF NOT EXISTS recipient_workspace_id uuid REFERENCES public.workspaces(id);

ALTER TABLE public.tour_requests
ADD COLUMN IF NOT EXISTS response_status text DEFAULT 'pending';

COMMENT ON COLUMN public.tour_requests.recipient_workspace_id IS 'The workspace (supplier) that receives this request';
COMMENT ON COLUMN public.tour_requests.response_status IS 'Response status: pending, responded, accepted, rejected';

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_tour_requests_recipient_workspace
ON public.tour_requests(recipient_workspace_id);

-- ============================================
-- 3. Request Responses - Supplier responses
-- ============================================
CREATE TABLE IF NOT EXISTS public.request_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.tour_requests(id) ON DELETE CASCADE,
  responder_workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  response_date timestamptz DEFAULT now(),
  status text DEFAULT 'draft',
  total_amount decimal(12,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.request_responses IS 'Supplier responses to tour requests';
COMMENT ON COLUMN public.request_responses.status IS 'Status: draft, submitted, accepted, rejected';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_request_responses_request
ON public.request_responses(request_id);

CREATE INDEX IF NOT EXISTS idx_request_responses_responder
ON public.request_responses(responder_workspace_id);

-- ============================================
-- 4. Request Response Items - Resource details
-- ============================================
CREATE TABLE IF NOT EXISTS public.request_response_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.request_responses(id) ON DELETE CASCADE,
  resource_type text NOT NULL,

  -- Link to actual resource (optional)
  resource_id uuid,
  resource_name text,

  -- Vehicle specific fields
  license_plate text,
  driver_name text,
  driver_phone text,

  -- Date range
  available_start_date date,
  available_end_date date,

  -- Pricing
  unit_price decimal(12,2),

  notes text,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.request_response_items IS 'Individual resources in a supplier response';
COMMENT ON COLUMN public.request_response_items.resource_type IS 'Resource type: vehicle, leader';
COMMENT ON COLUMN public.request_response_items.resource_id IS 'Optional FK to fleet_vehicles or tour_leaders';
COMMENT ON COLUMN public.request_response_items.resource_name IS 'Display name when no detailed record exists';

-- Index
CREATE INDEX IF NOT EXISTS idx_request_response_items_response
ON public.request_response_items(response_id);

-- ============================================
-- 5. Leader Availability - Available time slots
-- ============================================
CREATE TABLE IF NOT EXISTS public.leader_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  leader_id uuid NOT NULL REFERENCES public.tour_leaders(id) ON DELETE CASCADE,
  available_start_date date NOT NULL,
  available_end_date date NOT NULL,
  status text DEFAULT 'available',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.leader_availability IS 'Tour leader available time slots';
COMMENT ON COLUMN public.leader_availability.status IS 'Status: available, tentative, blocked';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leader_availability_workspace
ON public.leader_availability(workspace_id);

CREATE INDEX IF NOT EXISTS idx_leader_availability_leader
ON public.leader_availability(leader_id);

CREATE INDEX IF NOT EXISTS idx_leader_availability_dates
ON public.leader_availability(available_start_date, available_end_date);

-- ============================================
-- 6. RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE public.request_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_response_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leader_availability ENABLE ROW LEVEL SECURITY;

-- Request Responses: Viewable by sender workspace and responder workspace
DROP POLICY IF EXISTS "request_responses_select" ON public.request_responses;
CREATE POLICY "request_responses_select" ON public.request_responses FOR SELECT
USING (
  responder_workspace_id = get_current_user_workspace()
  OR EXISTS (
    SELECT 1 FROM public.tour_requests tr
    WHERE tr.id = request_id
    AND tr.workspace_id = get_current_user_workspace()
  )
  OR is_super_admin()
);

DROP POLICY IF EXISTS "request_responses_insert" ON public.request_responses;
CREATE POLICY "request_responses_insert" ON public.request_responses FOR INSERT
WITH CHECK (responder_workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "request_responses_update" ON public.request_responses;
CREATE POLICY "request_responses_update" ON public.request_responses FOR UPDATE
USING (responder_workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "request_responses_delete" ON public.request_responses;
CREATE POLICY "request_responses_delete" ON public.request_responses FOR DELETE
USING (responder_workspace_id = get_current_user_workspace() OR is_super_admin());

-- Request Response Items: Follow parent response access
DROP POLICY IF EXISTS "request_response_items_select" ON public.request_response_items;
CREATE POLICY "request_response_items_select" ON public.request_response_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.request_responses rr
    WHERE rr.id = response_id
    AND (
      rr.responder_workspace_id = get_current_user_workspace()
      OR EXISTS (
        SELECT 1 FROM public.tour_requests tr
        WHERE tr.id = rr.request_id
        AND tr.workspace_id = get_current_user_workspace()
      )
    )
  )
  OR is_super_admin()
);

DROP POLICY IF EXISTS "request_response_items_insert" ON public.request_response_items;
CREATE POLICY "request_response_items_insert" ON public.request_response_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.request_responses rr
    WHERE rr.id = response_id
    AND rr.responder_workspace_id = get_current_user_workspace()
  )
);

DROP POLICY IF EXISTS "request_response_items_update" ON public.request_response_items;
CREATE POLICY "request_response_items_update" ON public.request_response_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.request_responses rr
    WHERE rr.id = response_id
    AND rr.responder_workspace_id = get_current_user_workspace()
  )
  OR is_super_admin()
);

DROP POLICY IF EXISTS "request_response_items_delete" ON public.request_response_items;
CREATE POLICY "request_response_items_delete" ON public.request_response_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.request_responses rr
    WHERE rr.id = response_id
    AND rr.responder_workspace_id = get_current_user_workspace()
  )
  OR is_super_admin()
);

-- Leader Availability: Workspace scoped
DROP POLICY IF EXISTS "leader_availability_select" ON public.leader_availability;
CREATE POLICY "leader_availability_select" ON public.leader_availability FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "leader_availability_insert" ON public.leader_availability;
CREATE POLICY "leader_availability_insert" ON public.leader_availability FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

DROP POLICY IF EXISTS "leader_availability_update" ON public.leader_availability;
CREATE POLICY "leader_availability_update" ON public.leader_availability FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "leader_availability_delete" ON public.leader_availability;
CREATE POLICY "leader_availability_delete" ON public.leader_availability FOR DELETE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- ============================================
-- 7. Updated_at triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_request_responses_updated_at ON public.request_responses;
DROP TRIGGER IF EXISTS update_request_responses_updated_at ON public.request_responses;
CREATE TRIGGER update_request_responses_updated_at
  BEFORE UPDATE ON public.request_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leader_availability_updated_at ON public.leader_availability;
DROP TRIGGER IF EXISTS update_leader_availability_updated_at ON public.leader_availability;
CREATE TRIGGER update_leader_availability_updated_at
  BEFORE UPDATE ON public.leader_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
