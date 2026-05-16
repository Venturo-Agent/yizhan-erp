-- 修 verify_auth_password search_path 漏 extensions schema
--
-- 原 migration: 20260505210000_add_verify_auth_password_function.sql
--   設 search_path = 'auth', 'public'
--   但 pgcrypto extension（提供 crypt() / gen_salt()）裝在 'extensions' schema
--   → RPC 跑到 crypt() 時找不到函式 → throw error
--   → validate-login API 把 RPC error 當「密碼錯誤」處理 → 任何密碼一律回 401
--
-- 症狀：所有人登入都失敗、訊息「公司代號、帳號或密碼錯誤」
-- 發現：2026-05-07 William 嘗試登入失敗、追到 RPC search_path 漏 extensions
-- 已手動修：production 已 ALTER FUNCTION 修好（2026-05-07 ~04:00）
-- 本 migration：把修復寫進 migrations、防下次 DB reset 又壞
--
-- 對應 5/3 的 function_search_path_hardening.sql：那份註解就有寫「pgcrypto 在 extension」、
-- 但 5/5 新建的 verify_auth_password 沒套到這個規矩、需補上

ALTER FUNCTION public.verify_auth_password(uuid, text)
  SET search_path = 'auth', 'public', 'extensions';
