-- 出團確認表 (Tour Confirmation Sheets)
-- 用於記錄出團前的最終確認資料，包含交通/餐食/住宿/活動/其他

BEGIN;

-- ============================================
-- 主表：出團確認表
-- ============================================

CREATE TABLE IF NOT EXISTS public.tour_confirmation_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯團
  tour_id text NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  tour_code text NOT NULL,
  tour_name text NOT NULL,

  -- 團基本資訊
  departure_date date,
  return_date date,
  tour_leader_name text,
  tour_leader_id uuid, -- 領隊 ID（不設 FK 以增加靈活性）
  sales_person text,
  assistant text,
  pax integer,
  flight_info text,

  -- 狀態: draft, confirmed, in_progress, completed
  status text NOT NULL DEFAULT 'draft',

  -- 費用統計（由明細計算）
  total_expected_cost numeric(12,2) DEFAULT 0,
  total_actual_cost numeric(12,2) DEFAULT 0,

  -- 關聯的行程表版本
  itinerary_id text, -- 行程表 ID（不設 FK 以增加靈活性）
  itinerary_version integer,

  -- 備註
  notes text,

  -- 工作區
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),

  -- 時間戳
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text,
  updated_by text
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_confirmation_sheets_tour_id ON public.tour_confirmation_sheets(tour_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_sheets_workspace_id ON public.tour_confirmation_sheets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_sheets_status ON public.tour_confirmation_sheets(status);

-- 註解
COMMENT ON TABLE public.tour_confirmation_sheets IS '出團確認表主表 - 記錄出團前的最終確認資料';
COMMENT ON COLUMN public.tour_confirmation_sheets.status IS '狀態: draft=草稿, confirmed=已確認, in_progress=執行中, completed=已完成';

-- ============================================
-- 子表：出團確認表明細
-- ============================================

CREATE TABLE IF NOT EXISTS public.tour_confirmation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯主表
  sheet_id uuid NOT NULL REFERENCES public.tour_confirmation_sheets(id) ON DELETE CASCADE,

  -- 分類: transport, meal, accommodation, activity, other
  category text NOT NULL,

  -- 日期
  service_date date NOT NULL,
  service_date_end date, -- 住宿退房日
  day_label text, -- Day 1, Day 2...

  -- 供應商
  supplier_name text NOT NULL,
  supplier_id uuid, -- FK to suppliers（未來擴充）

  -- 內容
  title text NOT NULL,
  description text,

  -- 金額
  unit_price numeric(12,2),
  currency text DEFAULT 'TWD',
  quantity integer DEFAULT 1,
  subtotal numeric(12,2),
  expected_cost numeric(12,2),
  actual_cost numeric(12,2),

  -- 聯絡資訊 (JSONB)
  contact_info jsonb,

  -- 預訂資訊
  booking_reference text,
  booking_status text DEFAULT 'pending', -- pending, requested, confirmed, cancelled, pending_change

  -- 類型特定資料 (JSONB)
  type_data jsonb,

  -- 排序
  sort_order integer DEFAULT 0,

  -- 備註
  notes text,

  -- 工作區
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),

  -- 時間戳
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_confirmation_items_sheet_id ON public.tour_confirmation_items(sheet_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_items_category ON public.tour_confirmation_items(category);
CREATE INDEX IF NOT EXISTS idx_confirmation_items_workspace_id ON public.tour_confirmation_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_items_service_date ON public.tour_confirmation_items(service_date);
CREATE INDEX IF NOT EXISTS idx_confirmation_items_supplier_name ON public.tour_confirmation_items(supplier_name);

-- 註解
COMMENT ON TABLE public.tour_confirmation_items IS '出團確認表明細 - 各項目（交通/餐食/住宿/活動/其他）';
COMMENT ON COLUMN public.tour_confirmation_items.category IS '分類: transport=交通, meal=餐食, accommodation=住宿, activity=活動, other=其他';
COMMENT ON COLUMN public.tour_confirmation_items.booking_status IS '預訂狀態: pending=待處理, requested=已發需求, confirmed=已確認, cancelled=已取消, pending_change=待變更';
COMMENT ON COLUMN public.tour_confirmation_items.contact_info IS '聯絡資訊 JSON: {phone, fax, email, address, contact_person}';
COMMENT ON COLUMN public.tour_confirmation_items.type_data IS '類型特定資料 JSON，依 category 不同有不同欄位';

-- ============================================
-- 觸發器：自動更新主表的費用統計
-- ============================================

CREATE OR REPLACE FUNCTION update_confirmation_sheet_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新主表的費用統計
  UPDATE public.tour_confirmation_sheets
  SET
    total_expected_cost = (
      SELECT COALESCE(SUM(expected_cost), 0)
      FROM public.tour_confirmation_items
      WHERE sheet_id = COALESCE(NEW.sheet_id, OLD.sheet_id)
    ),
    total_actual_cost = (
      SELECT COALESCE(SUM(actual_cost), 0)
      FROM public.tour_confirmation_items
      WHERE sheet_id = COALESCE(NEW.sheet_id, OLD.sheet_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.sheet_id, OLD.sheet_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 觸發器
DROP TRIGGER IF EXISTS trigger_update_confirmation_totals ON public.tour_confirmation_items;
DROP TRIGGER IF EXISTS trigger_update_confirmation_totals ON public.tour_confirmation_items;
CREATE TRIGGER trigger_update_confirmation_totals
AFTER INSERT OR UPDATE OR DELETE ON public.tour_confirmation_items
FOR EACH ROW
EXECUTE FUNCTION update_confirmation_sheet_totals();

-- ============================================
-- 觸發器：自動計算小計
-- ============================================

CREATE OR REPLACE FUNCTION calculate_confirmation_item_subtotal()
RETURNS TRIGGER AS $$
BEGIN
  -- 自動計算小計
  IF NEW.unit_price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
    NEW.subtotal := NEW.unit_price * NEW.quantity;
  END IF;

  -- 預設 expected_cost = subtotal
  IF NEW.expected_cost IS NULL AND NEW.subtotal IS NOT NULL THEN
    NEW.expected_cost := NEW.subtotal;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 觸發器
DROP TRIGGER IF EXISTS trigger_calculate_item_subtotal ON public.tour_confirmation_items;
DROP TRIGGER IF EXISTS trigger_calculate_item_subtotal ON public.tour_confirmation_items;
CREATE TRIGGER trigger_calculate_item_subtotal
BEFORE INSERT OR UPDATE ON public.tour_confirmation_items
FOR EACH ROW
EXECUTE FUNCTION calculate_confirmation_item_subtotal();

COMMIT;
