-- 為 tour_bonus_settings 加「項目說明」欄位
-- 對應新版 BonusSettingsDialog（仿請款單樣式）的「項目說明」欄
-- 純加法、可空、舊資料相容

ALTER TABLE public.tour_bonus_settings
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.workspace_bonus_defaults
  ADD COLUMN IF NOT EXISTS description TEXT;
