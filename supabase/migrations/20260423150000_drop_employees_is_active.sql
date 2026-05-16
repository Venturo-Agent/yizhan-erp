-- Drop employees.is_active — SSOT consolidation
-- Reason: 同一個概念（員工是否在職）由 status enum 承擔（active/probation/leave/terminated）。
-- is_active 是冗餘 boolean、跟 status 容易不同步（hr/page.tsx terminate 只寫 status、不寫 is_active）。
-- 程式碼層 validate-login 同時檢查兩者就是在掩蓋這個 SSOT 漏洞。
--
-- 驗證：DB 15 員工全部 is_active=true、0 terminated、0 衝突 → 砍掉零風險。
--
-- 後續程式碼改動：
-- - validate-login: 移除冗餘的 is_active 檢查（status='terminated' 已涵蓋）
-- - employees/create: count 改用 status != 'terminated'、insert 移除 is_active
-- - 6 處 SELECT 字串移除 is_active

ALTER TABLE public.employees DROP COLUMN IF EXISTS is_active;
