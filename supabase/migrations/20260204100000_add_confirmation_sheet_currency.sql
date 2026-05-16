-- Add foreign currency and exchange rate fields to tour_confirmation_sheets
-- For converting expected_cost to foreign currency (e.g., TWD to JPY)

ALTER TABLE tour_confirmation_sheets
ADD COLUMN IF NOT EXISTS foreign_currency TEXT,
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4);

COMMENT ON COLUMN tour_confirmation_sheets.foreign_currency IS 'Foreign currency code (JP, TH, US, etc.)';
COMMENT ON COLUMN tour_confirmation_sheets.exchange_rate IS 'Exchange rate: 1 foreign currency = X TWD';
