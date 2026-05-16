-- 行程表新增 price_tiers (價格方案) jsonb 欄位
-- 之前只有 show_price_tiers 開關但沒有實際資料欄位，導致編輯器存不進去、公開頁讀不出來
ALTER TABLE public.itineraries ADD COLUMN IF NOT EXISTS price_tiers jsonb;
