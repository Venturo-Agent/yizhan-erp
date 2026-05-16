-- ============================================
-- Migration: workspaces 加 enabled_tour_categories
-- 控制每個租戶可用的團類型（開團時顯示哪些選項）
-- Date: 2026-04-12
-- ============================================

BEGIN;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS enabled_tour_categories TEXT[] DEFAULT ARRAY[
    'tour_group',
    'flight',
    'flight_hotel',
    'hotel',
    'car_service',
    'visa',
    'esim'
  ]::TEXT[];

COMMENT ON COLUMN public.workspaces.enabled_tour_categories IS '可用的團類型，開團時下拉選單顯示。空陣列代表沒有限制（顯示全部）';

COMMIT;
