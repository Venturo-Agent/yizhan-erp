-- 回填 tour.itinerary_id（從 itineraries.tour_id 反查）
UPDATE tours t
SET itinerary_id = i.id
FROM itineraries i
WHERE i.tour_id = t.id
  AND t.itinerary_id IS NULL;

-- 回填 tour.quote_id（從 quotes.tour_id 反查）
UPDATE tours t
SET quote_id = q.id
FROM quotes q
WHERE q.tour_id = t.id
  AND t.quote_id IS NULL;
