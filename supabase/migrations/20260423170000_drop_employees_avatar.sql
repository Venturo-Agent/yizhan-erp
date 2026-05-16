-- Drop employees.avatar — SSOT consolidation
-- Reason: employees 表同時有 avatar 跟 avatar_url 兩個欄位、語意一樣（頭像 URL）。
-- DB 驗證：15 員工 avatar 全 NULL、只有 1 員工 avatar_url 有值 → avatar 完全沒人寫。
-- 程式碼層 auth-store buildUserFromEmployee 跑 `avatar_url ?? avatar ?? undefined` 雙 fallback、是 SSOT 漏洞。
--
-- 後續程式碼改動：
-- - auth-store.ts: 移除 avatar fallback、只用 avatar_url
-- - 3 個 API SELECT 移除 avatar 欄位
-- - ColleaguesSection.tsx: emp.avatar 改 emp.avatar_url
-- - members route.ts: avatar: member.employees.avatar 改 avatar_url

ALTER TABLE public.employees DROP COLUMN IF EXISTS avatar;
