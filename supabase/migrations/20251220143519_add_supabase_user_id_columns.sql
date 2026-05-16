-- 檔案: 1_alter_existing_tables.sql
-- 目的: 修改現有的 `employees` 和 `itineraries` 表，為身份統一做準備。
-- 執行時間: 在執行任何操作之前，作為第一步。

-- 步驟 1.1: 為 `employees` 表新增一個欄位，用來儲存 Supabase User ID。
-- 這個欄位會是未來關聯的橋樑。
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS supabase_user_id UUID REFERENCES auth.users(id);

-- 步驟 1.3: 為 `itineraries` 表新增一個欄位，用來儲存基於 Supabase Auth 的建立者 ID。
-- 我們將在執行遷移腳本後，回填這個欄位的資料。
ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS creator_user_id UUID REFERENCES auth.users(id);
