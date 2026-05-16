-- 將 attractions 表的 name_en 欄位重命名為 english_name
-- 目的：統一全系統英文名欄位命名

-- 重命名欄位
ALTER TABLE attractions RENAME COLUMN name_en TO english_name;

-- 添加註釋
COMMENT ON COLUMN attractions.english_name IS '英文名稱（統一命名，原 name_en）';
