-- =============================================
-- 強化 tour_confirmation_items 資源關聯與需求單關聯
-- 支援 GPS 導航與領隊功能
-- =============================================

BEGIN;

-- 1. 添加與需求單 (tour_requests) 的關聯
ALTER TABLE public.tour_confirmation_items
ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.tour_requests(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tour_confirmation_items.request_id IS '關聯的需求單 ID';

CREATE INDEX IF NOT EXISTS idx_confirmation_items_request_id ON public.tour_confirmation_items(request_id);

-- 2. 添加資源關聯欄位（與 quote_items 一致）
ALTER TABLE public.tour_confirmation_items
ADD COLUMN IF NOT EXISTS resource_type TEXT;

COMMENT ON COLUMN public.tour_confirmation_items.resource_type IS '資源類型：restaurant（餐廳）/ hotel（飯店）/ attraction（景點）/ supplier（供應商）';

ALTER TABLE public.tour_confirmation_items
ADD COLUMN IF NOT EXISTS resource_id UUID;

COMMENT ON COLUMN public.tour_confirmation_items.resource_id IS '關聯的資源 ID，指向對應類型的表格';

CREATE INDEX IF NOT EXISTS idx_confirmation_items_resource_type ON public.tour_confirmation_items(resource_type);
CREATE INDEX IF NOT EXISTS idx_confirmation_items_resource_id ON public.tour_confirmation_items(resource_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_items_resource ON public.tour_confirmation_items(resource_type, resource_id);

-- 3. 添加 GPS 快取欄位（供領隊導航使用）
ALTER TABLE public.tour_confirmation_items
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);

ALTER TABLE public.tour_confirmation_items
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

ALTER TABLE public.tour_confirmation_items
ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

COMMENT ON COLUMN public.tour_confirmation_items.latitude IS 'GPS 緯度（從關聯資源快取）';
COMMENT ON COLUMN public.tour_confirmation_items.longitude IS 'GPS 經度（從關聯資源快取）';
COMMENT ON COLUMN public.tour_confirmation_items.google_maps_url IS 'Google Maps 連結';

-- 4. 添加領隊記帳相關欄位
ALTER TABLE public.tour_confirmation_items
ADD COLUMN IF NOT EXISTS leader_expense NUMERIC(12,2);

ALTER TABLE public.tour_confirmation_items
ADD COLUMN IF NOT EXISTS leader_expense_note TEXT;

ALTER TABLE public.tour_confirmation_items
ADD COLUMN IF NOT EXISTS leader_expense_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tour_confirmation_items.leader_expense IS '領隊實際支出金額';
COMMENT ON COLUMN public.tour_confirmation_items.leader_expense_note IS '領隊支出備註';
COMMENT ON COLUMN public.tour_confirmation_items.leader_expense_at IS '領隊記帳時間';

-- 5. 添加照片附件（領隊可上傳收據照片）
ALTER TABLE public.tour_confirmation_items
ADD COLUMN IF NOT EXISTS receipt_images TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.tour_confirmation_items.receipt_images IS '收據照片 URL 陣列';

-- 6. 同步需求單確認狀態的函數
CREATE OR REPLACE FUNCTION sync_confirmation_from_request()
RETURNS TRIGGER AS $$
BEGIN
  -- 當需求單狀態變更為 confirmed 時，同步更新對應的確認單項目
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    UPDATE public.tour_confirmation_items
    SET
      booking_status = 'confirmed',
      expected_cost = COALESCE(NEW.final_cost, NEW.quoted_cost, NEW.estimated_cost),
      updated_at = now()
    WHERE request_id = NEW.id;
  END IF;

  -- 當需求單狀態變更為 cancelled 時，同步更新
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.tour_confirmation_items
    SET
      booking_status = 'cancelled',
      updated_at = now()
    WHERE request_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_sync_confirmation_from_request ON public.tour_requests;
DROP TRIGGER IF EXISTS trigger_sync_confirmation_from_request ON public.tour_requests;
CREATE TRIGGER trigger_sync_confirmation_from_request
AFTER UPDATE ON public.tour_requests
FOR EACH ROW
EXECUTE FUNCTION sync_confirmation_from_request();

-- 7. 為 tour_requests 也添加資源關聯欄位（統一架構）
ALTER TABLE public.tour_requests
ADD COLUMN IF NOT EXISTS resource_type TEXT;

ALTER TABLE public.tour_requests
ADD COLUMN IF NOT EXISTS resource_id UUID;

ALTER TABLE public.tour_requests
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);

ALTER TABLE public.tour_requests
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

ALTER TABLE public.tour_requests
ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

COMMENT ON COLUMN public.tour_requests.resource_type IS '資源類型：restaurant（餐廳）/ hotel（飯店）/ attraction（景點）/ supplier（供應商）';
COMMENT ON COLUMN public.tour_requests.resource_id IS '關聯的資源 ID';
COMMENT ON COLUMN public.tour_requests.latitude IS 'GPS 緯度';
COMMENT ON COLUMN public.tour_requests.longitude IS 'GPS 經度';
COMMENT ON COLUMN public.tour_requests.google_maps_url IS 'Google Maps 連結';

CREATE INDEX IF NOT EXISTS idx_tour_requests_resource ON public.tour_requests(resource_type, resource_id);

COMMIT;
