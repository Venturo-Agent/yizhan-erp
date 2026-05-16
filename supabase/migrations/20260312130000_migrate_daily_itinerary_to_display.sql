-- 遷移 itineraries.daily_itinerary 的展示內容到 tour_itinerary_display
-- 策略：提取 JSONB 中的展示欄位，插入新表

DO $$
DECLARE
  rec RECORD;
  day_item JSONB;
  day_index INTEGER;
BEGIN
  -- 遍歷所有有 daily_itinerary 的 itineraries
  FOR rec IN 
    SELECT 
      id as itinerary_id, 
      workspace_id,
      daily_itinerary
    FROM itineraries
    WHERE daily_itinerary IS NOT NULL 
      AND jsonb_array_length(daily_itinerary) > 0
  LOOP
    -- 遍歷每一天
    FOR day_index IN 0..(jsonb_array_length(rec.daily_itinerary) - 1)
    LOOP
      day_item := rec.daily_itinerary -> day_index;
      
      -- 插入 display 表（只插入展示內容）
      INSERT INTO tour_itinerary_display (
        itinerary_id,
        workspace_id,
        day_number,
        day_label,
        date,
        title,
        highlight,
        description,
        images,
        recommendations,
        accommodation_url,
        accommodation_rating,
        is_same_accommodation
      )
      VALUES (
        rec.itinerary_id,
        rec.workspace_id,
        day_index + 1, -- day_number 從 1 開始
        day_item->>'dayLabel',
        day_item->>'date',
        day_item->>'title',
        day_item->>'highlight',
        day_item->>'description',
        day_item->'images', -- JSONB
        CASE 
          WHEN day_item->'recommendations' IS NOT NULL 
          THEN ARRAY(SELECT jsonb_array_elements_text(day_item->'recommendations'))
          ELSE NULL
        END,
        day_item->>'accommodationUrl',
        (day_item->>'accommodationRating')::integer,
        COALESCE((day_item->>'isSameAccommodation')::boolean, false)
      )
      ON CONFLICT (itinerary_id, day_number) DO UPDATE SET
        day_label = EXCLUDED.day_label,
        date = EXCLUDED.date,
        title = EXCLUDED.title,
        highlight = EXCLUDED.highlight,
        description = EXCLUDED.description,
        images = EXCLUDED.images,
        recommendations = EXCLUDED.recommendations,
        accommodation_url = EXCLUDED.accommodation_url,
        accommodation_rating = EXCLUDED.accommodation_rating,
        is_same_accommodation = EXCLUDED.is_same_accommodation,
        updated_at = now();
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Migration completed';
END $$;

-- 驗證遷移結果
DO $$
DECLARE
  itinerary_count INTEGER;
  display_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO itinerary_count 
  FROM itineraries 
  WHERE daily_itinerary IS NOT NULL 
    AND jsonb_array_length(daily_itinerary) > 0;
  
  SELECT COUNT(DISTINCT itinerary_id) INTO display_count 
  FROM tour_itinerary_display;
  
  RAISE NOTICE 'Itineraries with daily_itinerary: %', itinerary_count;
  RAISE NOTICE 'Migrated to display table: %', display_count;
  
  IF itinerary_count != display_count THEN
    RAISE WARNING 'Migration count mismatch: % itineraries vs % display records', 
      itinerary_count, display_count;
  END IF;
END $$;
