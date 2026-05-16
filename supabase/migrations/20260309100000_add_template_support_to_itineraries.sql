-- 加上模板支援到 itineraries 表
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS template_id VARCHAR(50);
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS template_code VARCHAR(50);
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);

-- tour_id 改為可空
ALTER TABLE itineraries ALTER COLUMN tour_id DROP NOT NULL;

-- CHECK constraint (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'itinerary_type_check') THEN
    ALTER TABLE itineraries ADD CONSTRAINT itinerary_type_check
    CHECK ((tour_id IS NOT NULL AND template_id IS NULL) OR (tour_id IS NULL AND template_id IS NOT NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_itineraries_template_id ON itineraries(template_id);

COMMENT ON COLUMN itineraries.template_id IS '模板 ID';
COMMENT ON COLUMN itineraries.template_code IS '模板代號';
COMMENT ON COLUMN itineraries.template_name IS '模板名稱';
