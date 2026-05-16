-- Migration: Add new fields to timebox tables
-- Date: 2025-12-27
-- Description: Add default_duration to boxes, review_notes and next_week_goals to weeks

BEGIN;

-- ============================================
-- 1. Add default_duration to timebox_boxes
-- ============================================
ALTER TABLE public.timebox_boxes
ADD COLUMN IF NOT EXISTS default_duration integer DEFAULT 60;

COMMENT ON COLUMN public.timebox_boxes.default_duration IS '預設時長（分鐘），用於快速建立排程';

-- ============================================
-- 2. Add review_notes to timebox_weeks
-- ============================================
ALTER TABLE public.timebox_weeks
ADD COLUMN IF NOT EXISTS review_notes text;

COMMENT ON COLUMN public.timebox_weeks.review_notes IS '週回顧筆記';

-- ============================================
-- 3. Add next_week_goals to timebox_weeks
-- ============================================
ALTER TABLE public.timebox_weeks
ADD COLUMN IF NOT EXISTS next_week_goals text;

COMMENT ON COLUMN public.timebox_weeks.next_week_goals IS '下週目標';

COMMIT;
