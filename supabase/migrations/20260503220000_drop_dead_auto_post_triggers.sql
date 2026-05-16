-- =============================================
-- 砍掉從未觸發的自動過帳 trigger（決定走 API 路 SSOT）
-- 2026-05-03
--
-- 背景：
--   20260111200000_create_auto_posting_triggers.sql 建了兩個 trigger：
--     - trigger_auto_post_receipt（收款 confirm 時自動過帳）
--     - trigger_auto_post_payment_request（請款 confirm 時自動過帳）
--
--   實測發現 trigger 從未真正觸發過：
--     1. trigger 條件寫 NEW.status = '1'、但 receipts.status 實際是 'confirmed' 字串
--     2. 條件永遠不成立、trigger 沒 fire
--     3. CORNER 啟用會計後 0 筆業務測試、所以這個 bug 沒人發現
--     4. 即使能 fire、trigger 寫死台灣科目代碼（1100/2100/6100）、新租戶會 silent fail
--
-- 決策：
--   走 API 路（src/app/api/accounting/vouchers/auto-create）作為 SSOT、不要兩條路打架。
--   API 用 payment_methods.debit_account_id / credit_account_id 動態決定科目、客戶可改。
--
-- 影響：
--   - production 行為 0 改變（trigger 本來就沒運作）
--   - 純清理 dead code
--   - 保留 function（drop trigger only）、未來若需要可重新 attach
-- =============================================

DROP TRIGGER IF EXISTS trigger_auto_post_receipt ON public.receipts;
DROP TRIGGER IF EXISTS trigger_auto_post_payment_request ON public.payment_requests;
