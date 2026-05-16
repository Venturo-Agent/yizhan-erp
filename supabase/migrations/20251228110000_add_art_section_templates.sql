-- ============================================
-- 補齊 Art 風格的各區塊模板
-- ============================================
-- 日期: 2025-12-28
-- 目的: 讓 Art (藝術雜誌) 風格在所有區塊都有對應模板

BEGIN;

-- ============================================
-- 1. 新增 Art 飯店模板
-- ============================================
INSERT INTO public.hotel_templates (id, name, description, sort_order) VALUES
  ('art', '藝術雜誌', '錯落有致的飯店圖庫展示，如 Sanctuaries 區塊', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- ============================================
-- 2. 新增 Art 特色模板
-- ============================================
INSERT INTO public.features_templates (id, name, description, sort_order) VALUES
  ('art', '藝術雜誌', '水平滾動卡片式特色展示，如 The Finale 區塊', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- ============================================
-- 3. 新增 Art 領隊模板
-- ============================================
INSERT INTO public.leader_templates (id, name, description, sort_order) VALUES
  ('art', '藝術雜誌', '雜誌風格的領隊介紹', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- ============================================
-- 4. 新增 Art 報價模板
-- ============================================
INSERT INTO public.pricing_templates (id, name, description, sort_order) VALUES
  ('art', '藝術雜誌', '雜誌風格的價格展示', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- ============================================
-- 5. 同時補齊其他主要風格 (Dreamscape, Gemini, Nature, Serene)
-- ============================================

-- Dreamscape (夢幻漫遊)
INSERT INTO public.hotel_templates (id, name, description, sort_order) VALUES
  ('dreamscape', '夢幻漫遊', '夢幻風格的飯店展示', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.features_templates (id, name, description, sort_order) VALUES
  ('dreamscape', '夢幻漫遊', '夢幻風格的特色展示', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.leader_templates (id, name, description, sort_order) VALUES
  ('dreamscape', '夢幻漫遊', '夢幻風格的領隊介紹', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.pricing_templates (id, name, description, sort_order) VALUES
  ('dreamscape', '夢幻漫遊', '夢幻風格的價格展示', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Gemini
INSERT INTO public.hotel_templates (id, name, description, sort_order) VALUES
  ('gemini', 'Gemini 風格', 'Gemini 風格的飯店展示', 6)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.features_templates (id, name, description, sort_order) VALUES
  ('gemini', 'Gemini 風格', 'Gemini 風格的特色展示', 6)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.leader_templates (id, name, description, sort_order) VALUES
  ('gemini', 'Gemini 風格', 'Gemini 風格的領隊介紹', 6)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.pricing_templates (id, name, description, sort_order) VALUES
  ('gemini', 'Gemini 風格', 'Gemini 風格的價格展示', 6)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Nature (日式和風)
INSERT INTO public.hotel_templates (id, name, description, sort_order) VALUES
  ('nature', '日式和風', '日式風格的飯店展示', 7)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.features_templates (id, name, description, sort_order) VALUES
  ('nature', '日式和風', '日式風格的特色展示', 7)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.leader_templates (id, name, description, sort_order) VALUES
  ('nature', '日式和風', '日式風格的領隊介紹', 7)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.pricing_templates (id, name, description, sort_order) VALUES
  ('nature', '日式和風', '日式風格的價格展示', 7)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Serene (浮水印風)
INSERT INTO public.hotel_templates (id, name, description, sort_order) VALUES
  ('serene', '浮水印風', '浮水印風格的飯店展示', 8)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.features_templates (id, name, description, sort_order) VALUES
  ('serene', '浮水印風', '浮水印風格的特色展示', 8)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.leader_templates (id, name, description, sort_order) VALUES
  ('serene', '浮水印風', '浮水印風格的領隊介紹', 8)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.pricing_templates (id, name, description, sort_order) VALUES
  ('serene', '浮水印風', '浮水印風格的價格展示', 8)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Collage (互動拼貼)
INSERT INTO public.hotel_templates (id, name, description, sort_order) VALUES
  ('collage', '互動拼貼', '拼貼風格的飯店展示', 9)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.features_templates (id, name, description, sort_order) VALUES
  ('collage', '互動拼貼', '拼貼風格的特色展示', 9)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.leader_templates (id, name, description, sort_order) VALUES
  ('collage', '互動拼貼', '拼貼風格的領隊介紹', 9)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.pricing_templates (id, name, description, sort_order) VALUES
  ('collage', '互動拼貼', '拼貼風格的價格展示', 9)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

COMMIT;
