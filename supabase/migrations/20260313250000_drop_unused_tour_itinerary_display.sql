-- ============================================
-- Migration: 刪除未使用的 tour_itinerary_display 表
-- Date: 2026-03-13
-- Reason: 此表建立後從未使用，資料為空，為多餘表格
-- ============================================

-- 刪除 tour_itinerary_display 表
DROP TABLE IF EXISTS tour_itinerary_display CASCADE;

-- 註解：
-- 此表原本計畫用來取代 itineraries.daily_itinerary 的展示設定
-- 但遷移計畫未完成，表內無資料，且未被程式碼使用
-- 直接刪除以避免認知負擔
