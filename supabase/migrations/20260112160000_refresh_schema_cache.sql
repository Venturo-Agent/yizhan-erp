-- 刷新 PostgREST schema cache
-- 當資料庫結構改變時需要執行

NOTIFY pgrst, 'reload schema';

-- 強制刷新 schema cache（備用方法）
-- 透過更新任何表格的註解來觸發
COMMENT ON TABLE public.employees IS '員工資料表（schema cache 刷新）';
