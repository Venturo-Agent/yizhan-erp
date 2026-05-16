-- 列印模板多租戶整合（公版 + 4 樣可改）
-- William 拍板：1 公版、客戶可改 Logo / 公司名 / 主色 hex / 印章
-- 想改公版以外 → 收 2 萬一次性設定費、由 venturo 開新模板（現階段不做切換機制）
--
-- workspaces 表已有：logo_url（Logo）、legal_name（公司名）、company_seal_url（印章）
-- 本 migration 補：brand_primary_hex、print_accent_hex（主色 / 強調色）
--
-- 純加法、不動既有資料

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS brand_primary_hex TEXT,
  ADD COLUMN IF NOT EXISTS print_accent_hex TEXT;

COMMENT ON COLUMN workspaces.brand_primary_hex IS '品牌主色（hex），列印模板採用';
COMMENT ON COLUMN workspaces.print_accent_hex IS '列印強調色（hex），列印模板採用';
