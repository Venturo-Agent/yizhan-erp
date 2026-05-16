-- =============================================
-- 成本轉移改「新建對沖請款單」模式 — 新增 transferred_pair_id
-- 2026-04-23
--
-- 設計（William 確認）：
--   不在既有請款單裡動 item、改成「建兩張全新的請款單」：
--     R_src（tour = A 來源團）：amount = -X、items 複製原 items 但金額取負
--     R_dst（tour = B 目標團）：amount = +X、items 複製原 items 且金額為正
--     R_src 跟 R_dst 共用同一個 transferred_pair_id
--   兩張都走正常 pending → 出納 → 正式的 flow。
--
-- 為什麼只加在 payment_requests：
--   items 屬於某張 request、request 已經有 pair_id、items 不需要重複標記。
--   出納渲染時按 request.transferred_pair_id 過濾分區、內層 items 直接跟著 parent。
--
-- amount 驗證：
--   實測 INSERT amount=-1 無 CHECK violation、23502 error 只是其他 NOT NULL 欄位未填、
--   payment_requests.amount 本就允許負值、不用改 constraint。
--
-- 配套程式改動（同次 PR）：
--   - CostTransferDialog 從 UPDATE tour_id 改成建兩張新請款單
--   - PrintDisbursementPreview 按 pair_id 配對渲染、pair 區小計 = 0
--   - useCreateDisbursement selectedAmount 扣除 pair requests 貢獻
--   - 請款單列表 UI 加成本轉移 badge
-- =============================================

ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS transferred_pair_id UUID;

COMMENT ON COLUMN public.payment_requests.transferred_pair_id IS
  '成本轉移配對 ID：R_src（amount<0、來源團扣減）跟 R_dst（amount>0、目標團認列）共用同一個 UUID';

CREATE INDEX IF NOT EXISTS idx_pr_transferred_pair
  ON public.payment_requests(transferred_pair_id)
  WHERE transferred_pair_id IS NOT NULL;
