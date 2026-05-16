-- 把 tour_bonus_settings 跟 payment_requests 串起來
-- 一筆 bonus_setting（OP / 業務 / 團隊獎金）可以「衍生」一張請款單（公司請款、發給員工 / 團隊）
-- payment_request_id 設了就鎖、避免重複生
-- disbursement_date = 使用者要這筆獎金何時出帳
ALTER TABLE public.tour_bonus_settings
  ADD COLUMN IF NOT EXISTS payment_request_id UUID REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS disbursement_date DATE;
