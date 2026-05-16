-- 將所有 workspace 代碼轉為小寫
-- 確保登入時的小寫查詢能正確匹配
-- 只更新那些轉小寫後不會跟現有 code 衝突的

UPDATE public.workspaces w
SET code = LOWER(w.code)
WHERE w.code != LOWER(w.code)
  AND NOT EXISTS (
    SELECT 1 FROM public.workspaces w2
    WHERE w2.id != w.id
      AND w2.code = LOWER(w.code)
  );

-- 刷新 schema cache
NOTIFY pgrst, 'reload schema';
