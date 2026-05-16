-- Migration: 新增團服務類型、部門、團控必填等欄位
-- Date: 2026-04-08
-- Description: 為 tours 表新增 tour_service_type 欄位，調整 controller_id 為必填，新增 department_id 欄位

-- 1. 新增 tour_service_type 欄位到 tours 表
ALTER TABLE tours 
ADD COLUMN IF NOT EXISTS tour_service_type VARCHAR(50) NOT NULL DEFAULT 'tour_group';

-- 2. 新增檢查約束，確保 tour_service_type 只能是特定值
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tour_service_type') THEN
    ALTER TABLE tours ADD CONSTRAINT chk_tour_service_type
    CHECK (tour_service_type IN ('flight','flight_hotel','hotel','car_service','tour_group','visa'));
  END IF;
END $$;

-- 3. 新增 department_id 欄位（選填）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='departments') THEN
    ALTER TABLE tours ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
  ELSE
    ALTER TABLE tours ADD COLUMN IF NOT EXISTS department_id UUID;
  END IF;
END $$;

-- 4. 將 controller_id 改為必填（NOT NULL）
-- 注意：需要先處理現有資料中 controller_id 為 NULL 的情況
-- 這裡我們先將 NULL 值設為一個預設值（需要有一個預設團控員工）
DO $$ 
DECLARE 
  default_controller_id UUID;
BEGIN
  -- 嘗試獲取一個員工作為預設團控
  SELECT id INTO default_controller_id 
  FROM employees 
  WHERE is_active = true 
  LIMIT 1;
  
  -- 如果找不到任何員工，可能需要先建立一個
  IF default_controller_id IS NULL THEN
    RAISE NOTICE '沒有找到可用的員工作為預設團控，請先建立員工資料';
  ELSE
    -- 更新現有資料中 controller_id 為 NULL 的記錄
    UPDATE tours 
    SET controller_id = default_controller_id 
    WHERE controller_id IS NULL;
    
    -- 然後將欄位改為 NOT NULL
    ALTER TABLE tours 
    ALTER COLUMN controller_id SET NOT NULL;
  END IF;
END $$;

-- 5. 為 orders 表的 sales_person 欄位新增檢查
-- 注意：目前 sales_person 是字串類型，不是外鍵
-- 如果需要改為外鍵關聯，需要另外的遷移

-- 6. 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_tours_service_type ON tours(tour_service_type);
CREATE INDEX IF NOT EXISTS idx_tours_department ON tours(department_id);
CREATE INDEX IF NOT EXISTS idx_tours_controller ON tours(controller_id);

-- 7. 更新現有資料的 tour_service_type
-- 所有現有團都預設為 'tour_group'（旅遊團）
UPDATE tours 
SET tour_service_type = 'tour_group' 
WHERE tour_service_type IS NULL OR tour_service_type = '';

-- 記錄遷移完成
COMMENT ON COLUMN tours.tour_service_type IS '團服務類型：flight(機票), flight_hotel(機加酒), hotel(訂房), car_service(派車), tour_group(旅遊團), visa(簽證)';
COMMENT ON COLUMN tours.department_id IS '部門 ID（選填）';
COMMENT ON COLUMN tours.controller_id IS '團控人員 ID（必填）';