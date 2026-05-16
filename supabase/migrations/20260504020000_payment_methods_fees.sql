-- payment_methods 加手續費欄位
-- 業務需求（William 拍板）：刷卡 / 匯款 / 轉帳 等付款方式可設手續費
-- - fee_percent: 百分比（如 2.00 = 2%）
-- - fee_fixed: 固定金額（如轉帳費 30 元）
-- 實際手續費 = amount × fee_percent / 100 + fee_fixed
-- 純加法、預設 0、不影響既有資料

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS fee_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_fixed numeric(20,2) NOT NULL DEFAULT 0;
