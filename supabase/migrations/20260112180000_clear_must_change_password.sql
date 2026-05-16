-- 清除所有現有員工的 must_change_password 標記
-- 這個標記只應該對「新建立」的員工生效

UPDATE public.employees
SET must_change_password = false
WHERE must_change_password = true;

-- 刷新 schema cache
NOTIFY pgrst, 'reload schema';
