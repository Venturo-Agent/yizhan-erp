-- Migration: 拔掉 tours.quote_id 與 quotes.proposal_package_id
-- 日期：2026-04-24
-- 文件：docs/QUOTES_SSOT.md
--
-- 為什麼拔：
-- 1. tours.quote_id 是「主報價快速捷徑」，造成 SSOT 破碎
--    - 全表 16 個有 quote_id 的團、6 個（37.5%）指錯到 quick 報價
--    - 主報價分頁顯示錯誤的報價單給業務看
--    - 葡萄串模型：報價自己用 quotes.tour_id 反指、不需要捷徑
-- 2. quotes.proposal_package_id 是 2026-03-14 cleanup 漏拔的
--    - 全表 0 筆有值（驗證過）
--    - proposal_packages 表早已 DROP CASCADE
--
-- 影響：
-- - quotes 表 row 完全不動
-- - tours 表 row 完全不動（只拔 column）
-- - code 已改用 quotes.tour_id + quote_type 反查（同 commit）

BEGIN;

-- 1. tours 表拔掉 quote_id 欄位
ALTER TABLE public.tours DROP COLUMN IF EXISTS quote_id;

-- 2. quotes 表拔掉 proposal_package_id 欄位（補當初漏拔）
ALTER TABLE public.quotes DROP COLUMN IF EXISTS proposal_package_id;

COMMIT;
