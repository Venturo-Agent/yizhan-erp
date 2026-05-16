-- 為 tour_requests 添加資源分配欄位
-- 用於記錄交通需求分配的車輛、領隊需求分配的領隊

BEGIN;

-- 添加分配相關欄位
ALTER TABLE public.tour_requests
ADD COLUMN IF NOT EXISTS assigned_vehicle_id uuid REFERENCES public.fleet_vehicles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_leader_id uuid REFERENCES public.tour_leaders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
ADD COLUMN IF NOT EXISTS assigned_by uuid,
ADD COLUMN IF NOT EXISTS assigned_by_name text,
ADD COLUMN IF NOT EXISTS assignment_note text;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_tour_requests_assigned_vehicle ON public.tour_requests(assigned_vehicle_id) WHERE assigned_vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tour_requests_assigned_leader ON public.tour_requests(assigned_leader_id) WHERE assigned_leader_id IS NOT NULL;

-- 添加註解
COMMENT ON COLUMN public.tour_requests.assigned_vehicle_id IS '分配的車輛 ID（交通需求用）';
COMMENT ON COLUMN public.tour_requests.assigned_leader_id IS '分配的領隊 ID（領隊需求用）';
COMMENT ON COLUMN public.tour_requests.assigned_at IS '分配時間';
COMMENT ON COLUMN public.tour_requests.assigned_by IS '分配人 ID';
COMMENT ON COLUMN public.tour_requests.assigned_by_name IS '分配人名稱';
COMMENT ON COLUMN public.tour_requests.assignment_note IS '分配備註';

COMMIT;
