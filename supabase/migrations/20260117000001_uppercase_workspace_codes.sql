-- 將所有 workspace code 改為大寫
BEGIN;

-- 只更新那些轉大寫後不會跟現有 code 衝突的
UPDATE public.workspaces w
SET code = UPPER(w.code)
WHERE w.code != UPPER(w.code)
  AND NOT EXISTS (
    SELECT 1 FROM public.workspaces w2
    WHERE w2.id != w.id
      AND w2.code = UPPER(w.code)
  );

COMMIT;
