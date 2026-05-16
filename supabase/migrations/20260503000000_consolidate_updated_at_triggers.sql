-- ============================================================================
-- 20260503000000_consolidate_updated_at_triggers.sql
--
-- B-001: 整合重複的 updated_at trigger function
-- 來源：docs/_followup_backlog.md
-- 憲法：Section 2 已標準化 set_updated_at()（見 20260502270000）
--
-- 本 migration 做：
--   1) 把所有用「變體 function」(body 都只是 NEW.updated_at := now()) 的
--      trigger 改用 public.set_updated_at()。trigger 名稱不變。
--   2) DROP 12 個變體 function（body 跟 set_updated_at 完全等價）
--
-- 不做：
--   - 不動 update_updated_at_column()。憲法 §16 凍結模組
--     (channels / messages / channel_groups) 仍用此 function、鐵律不能動。
--     等凍結解除後另案清。
--   - 不動 payment_requests / suppliers 表的 duplicate trigger（B-002 範圍）。
--   - 不動憲法 §16 凍結模組的 trigger。
--
-- 等價性驗證：以下 12 個 function body 全部都是
--     BEGIN NEW.updated_at = now(); RETURN NEW; END;
--   跟 set_updated_at() 完全相同（部分用 NOW() 大寫、語意一致）。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) 改 trigger 用 set_updated_at()（15 條 trigger、12 個變體 function）
--    DROP TRIGGER IF EXISTS + CREATE TRIGGER 同名、只換 function reference。
-- ----------------------------------------------------------------------------

-- update_ai_memories_updated_at → ai_conversations, ai_memories
DROP TRIGGER IF EXISTS trigger_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER trigger_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_ai_memories_updated_at ON public.ai_memories;
CREATE TRIGGER trigger_ai_memories_updated_at
  BEFORE UPDATE ON public.ai_memories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- update_airport_images_updated_at → airport_images
DROP TRIGGER IF EXISTS trigger_airport_images_updated_at ON public.airport_images;
CREATE TRIGGER trigger_airport_images_updated_at
  BEFORE UPDATE ON public.airport_images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- update_hotels_updated_at → hotels
DROP TRIGGER IF EXISTS trigger_hotels_updated_at ON public.hotels;
CREATE TRIGGER trigger_hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- update_image_library_updated_at → image_library
DROP TRIGGER IF EXISTS trigger_update_image_library_updated_at ON public.image_library;
CREATE TRIGGER trigger_update_image_library_updated_at
  BEFORE UPDATE ON public.image_library
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- update_michelin_restaurants_updated_at → michelin_restaurants
DROP TRIGGER IF EXISTS trigger_update_michelin_restaurants_updated_at ON public.michelin_restaurants;
CREATE TRIGGER trigger_update_michelin_restaurants_updated_at
  BEFORE UPDATE ON public.michelin_restaurants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- update_premium_experiences_updated_at → premium_experiences
DROP TRIGGER IF EXISTS trigger_update_premium_experiences_updated_at ON public.premium_experiences;
CREATE TRIGGER trigger_update_premium_experiences_updated_at
  BEFORE UPDATE ON public.premium_experiences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- update_regions_updated_at → cities, countries, regions
DROP TRIGGER IF EXISTS update_cities_updated_at_trigger ON public.cities;
CREATE TRIGGER update_cities_updated_at_trigger
  BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS update_countries_updated_at_trigger ON public.countries;
CREATE TRIGGER update_countries_updated_at_trigger
  BEFORE UPDATE ON public.countries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS update_regions_updated_at_trigger ON public.regions;
CREATE TRIGGER update_regions_updated_at_trigger
  BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- update_restaurants_updated_at → restaurants
DROP TRIGGER IF EXISTS trigger_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER trigger_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- update_supplier_categories_updated_at → supplier_categories
DROP TRIGGER IF EXISTS trigger_update_supplier_categories_updated_at ON public.supplier_categories;
CREATE TRIGGER trigger_update_supplier_categories_updated_at
  BEFORE UPDATE ON public.supplier_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- update_suppliers_updated_at → suppliers
-- 注意：suppliers 同時掛了 suppliers_updated_at_trigger（用 update_suppliers_updated_at）
-- 跟 update_suppliers_updated_at（用 update_updated_at_column）兩條 trigger。
-- 這裡只把 suppliers_updated_at_trigger 換成 set_updated_at()、duplicate 留給 B-002 處理。
DROP TRIGGER IF EXISTS suppliers_updated_at_trigger ON public.suppliers;
CREATE TRIGGER suppliers_updated_at_trigger
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- update_tii_updated_at → tour_itinerary_items
DROP TRIGGER IF EXISTS tii_updated_at ON public.tour_itinerary_items;
CREATE TRIGGER tii_updated_at
  BEFORE UPDATE ON public.tour_itinerary_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- update_tour_meal_settings_updated_at → tour_meal_settings
DROP TRIGGER IF EXISTS tour_meal_settings_updated_at ON public.tour_meal_settings;
CREATE TRIGGER tour_meal_settings_updated_at
  BEFORE UPDATE ON public.tour_meal_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2) DROP 12 個變體 function（body 已等價於 set_updated_at）
--    用 IF EXISTS 是因為 idempotent。
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.update_ai_memories_updated_at();
DROP FUNCTION IF EXISTS public.update_airport_images_updated_at();
DROP FUNCTION IF EXISTS public.update_hotels_updated_at();
DROP FUNCTION IF EXISTS public.update_image_library_updated_at();
DROP FUNCTION IF EXISTS public.update_michelin_restaurants_updated_at();
DROP FUNCTION IF EXISTS public.update_premium_experiences_updated_at();
DROP FUNCTION IF EXISTS public.update_regions_updated_at();
DROP FUNCTION IF EXISTS public.update_restaurants_updated_at();
DROP FUNCTION IF EXISTS public.update_supplier_categories_updated_at();
DROP FUNCTION IF EXISTS public.update_suppliers_updated_at();
DROP FUNCTION IF EXISTS public.update_tii_updated_at();
DROP FUNCTION IF EXISTS public.update_tour_meal_settings_updated_at();

-- ============================================================================
-- 後續：
--   - B-002 會處理 payment_requests / suppliers 的 duplicate trigger
--   - update_updated_at_column 等凍結模組解除後再清
-- ============================================================================
