-- LinkPay 整套 teardown
-- 5/7 William 拍板「再給我們清理乾淨」
-- linkpay_logs 0 rows、CASCADE 安全

DROP TABLE IF EXISTS public.linkpay_logs CASCADE;
