-- ============================================
-- Migration: 清理所有多餘的表格
-- Date: 2026-03-13
-- Reason: 回滾不必要的重構，保持架構簡單
-- ============================================

-- 1. 刪除 Week 1-2 建立的多餘表格
DROP TABLE IF EXISTS tour_daily_display CASCADE;

-- 2. 刪除舊架構的空表
DROP TABLE IF EXISTS tour_itinerary_display CASCADE;
DROP TABLE IF EXISTS itinerary_items CASCADE;
DROP TABLE IF EXISTS itinerary_days CASCADE;
DROP TABLE IF EXISTS _backup_daily_itinerary CASCADE;

-- 註解：
-- 保留 itineraries（含 daily_itinerary 欄位）
-- 保留 tour_itinerary_items（核心表）
-- 保留 daily_templates（模板）
-- 
-- 架構簡單化：
-- - itineraries.daily_itinerary = 展示層資料
-- - tour_itinerary_items = 業務邏輯資料
-- 兩者用途不同，都需要保留
