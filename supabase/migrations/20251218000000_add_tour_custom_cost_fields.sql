-- 旅遊團自訂費用欄位
-- 用於團員名單中新增自訂的費用欄位（如：機票、簽證費、保險等）

BEGIN;

-- 1. 自訂費用欄位定義表
CREATE TABLE IF NOT EXISTS public.tour_custom_cost_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id text NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 自訂費用欄位值表
CREATE TABLE IF NOT EXISTS public.tour_custom_cost_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.tour_custom_cost_fields(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.order_members(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(field_id, member_id)
);

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_tour_custom_cost_fields_tour_id ON public.tour_custom_cost_fields(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_custom_cost_values_field_id ON public.tour_custom_cost_values(field_id);
CREATE INDEX IF NOT EXISTS idx_tour_custom_cost_values_member_id ON public.tour_custom_cost_values(member_id);

-- 4. 註解
COMMENT ON TABLE public.tour_custom_cost_fields IS '旅遊團自訂費用欄位定義';
COMMENT ON TABLE public.tour_custom_cost_values IS '旅遊團自訂費用欄位值';

COMMIT;
