-- =====================================================
-- 報價確認系統 (Quote Confirmation System)
-- 2025-12-28
-- =====================================================
-- 功能：
-- 1. 雙軌確認機制（客戶線上確認 OR 業務手動確認）
-- 2. 確認版本鎖定
-- 3. 稽核軌跡記錄
-- =====================================================

BEGIN;

-- =====================================================
-- 1. 為 quotes 表添加確認相關欄位
-- =====================================================

-- 確認狀態：draft -> pending_confirmation -> customer_confirmed / staff_confirmed -> closed
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS confirmation_status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS confirmation_token text,
ADD COLUMN IF NOT EXISTS confirmation_token_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS confirmed_by_type text, -- 'customer' | 'staff'
ADD COLUMN IF NOT EXISTS confirmed_by_name text,
ADD COLUMN IF NOT EXISTS confirmed_by_email text,
ADD COLUMN IF NOT EXISTS confirmed_by_phone text,
ADD COLUMN IF NOT EXISTS confirmed_by_staff_id text,
ADD COLUMN IF NOT EXISTS confirmed_version integer,
ADD COLUMN IF NOT EXISTS confirmation_ip text,
ADD COLUMN IF NOT EXISTS confirmation_user_agent text,
ADD COLUMN IF NOT EXISTS confirmation_notes text;

-- 索引
CREATE INDEX IF NOT EXISTS idx_quotes_confirmation_token ON public.quotes(confirmation_token) WHERE confirmation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_confirmation_status ON public.quotes(confirmation_status);

-- 欄位說明
COMMENT ON COLUMN public.quotes.confirmation_status IS '確認狀態: draft=草稿, pending=待客戶確認, customer_confirmed=客戶已確認, staff_confirmed=業務已確認, closed=已成交';
COMMENT ON COLUMN public.quotes.confirmation_token IS '客戶確認用的唯一 token（隨機生成）';
COMMENT ON COLUMN public.quotes.confirmation_token_expires_at IS 'Token 過期時間';
COMMENT ON COLUMN public.quotes.confirmed_at IS '確認時間';
COMMENT ON COLUMN public.quotes.confirmed_by_type IS '確認者類型: customer=客戶, staff=業務';
COMMENT ON COLUMN public.quotes.confirmed_by_name IS '確認者姓名';
COMMENT ON COLUMN public.quotes.confirmed_by_email IS '確認者 Email';
COMMENT ON COLUMN public.quotes.confirmed_by_phone IS '確認者電話';
COMMENT ON COLUMN public.quotes.confirmed_by_staff_id IS '業務確認時的員工 ID';
COMMENT ON COLUMN public.quotes.confirmed_version IS '確認時鎖定的版本號';
COMMENT ON COLUMN public.quotes.confirmation_ip IS '確認時的 IP 地址（稽核用）';
COMMENT ON COLUMN public.quotes.confirmation_user_agent IS '確認時的瀏覽器資訊（稽核用）';
COMMENT ON COLUMN public.quotes.confirmation_notes IS '確認備註';


-- =====================================================
-- 2. 建立確認歷史記錄表
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quote_confirmation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id text NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id),

  -- 動作類型
  action text NOT NULL, -- 'send_link' | 'resend_link' | 'customer_confirmed' | 'staff_confirmed' | 'revoked' | 'expired'

  -- 確認資訊
  confirmed_by_type text, -- 'customer' | 'staff'
  confirmed_by_name text,
  confirmed_by_email text,
  confirmed_by_phone text,
  confirmed_by_staff_id uuid REFERENCES public.employees(id),
  confirmed_version integer,

  -- 稽核資訊
  ip_address text,
  user_agent text,
  notes text,

  -- 時間戳
  created_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_quote_confirmation_logs_quote_id ON public.quote_confirmation_logs(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_confirmation_logs_created_at ON public.quote_confirmation_logs(created_at DESC);

-- RLS 策略
ALTER TABLE public.quote_confirmation_logs ENABLE ROW LEVEL SECURITY;

-- 先刪除已存在的 policy（允許重跑）
DROP POLICY IF EXISTS "quote_confirmation_logs_select" ON public.quote_confirmation_logs;
DROP POLICY IF EXISTS "quote_confirmation_logs_insert" ON public.quote_confirmation_logs;

DROP POLICY IF EXISTS "quote_confirmation_logs_select" ON public.quote_confirmation_logs;
CREATE POLICY "quote_confirmation_logs_select" ON public.quote_confirmation_logs FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

DROP POLICY IF EXISTS "quote_confirmation_logs_insert" ON public.quote_confirmation_logs;
CREATE POLICY "quote_confirmation_logs_insert" ON public.quote_confirmation_logs FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace() OR workspace_id IS NULL);

-- 欄位說明
COMMENT ON TABLE public.quote_confirmation_logs IS '報價單確認歷史記錄（稽核軌跡）';
COMMENT ON COLUMN public.quote_confirmation_logs.action IS '動作類型: send_link=發送確認連結, resend_link=重新發送, customer_confirmed=客戶確認, staff_confirmed=業務確認, revoked=撤銷確認, expired=連結過期';


-- =====================================================
-- 3. 建立生成 token 的函數
-- =====================================================

CREATE OR REPLACE FUNCTION generate_confirmation_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  i integer;
BEGIN
  -- 生成 32 字元的隨機 token（排除容易混淆的字元）
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;


-- =====================================================
-- 4. 建立發送確認連結的函數
-- =====================================================

CREATE OR REPLACE FUNCTION send_quote_confirmation(
  p_quote_id text,
  p_expires_in_days integer DEFAULT 7,
  p_staff_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token text;
  v_quote record;
  v_expires_at timestamptz;
BEGIN
  -- 取得報價單資訊
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;

  IF v_quote IS NULL THEN
    RETURN json_build_object('success', false, 'error', '報價單不存在');
  END IF;

  -- 生成新的 token
  v_token := generate_confirmation_token();
  v_expires_at := now() + (p_expires_in_days || ' days')::interval;

  -- 更新報價單
  UPDATE public.quotes
  SET
    confirmation_status = 'pending',
    confirmation_token = v_token,
    confirmation_token_expires_at = v_expires_at,
    updated_at = now()
  WHERE id = p_quote_id;

  -- 記錄日誌
  INSERT INTO public.quote_confirmation_logs (
    quote_id,
    workspace_id,
    action,
    confirmed_by_staff_id,
    confirmed_version,
    notes
  ) VALUES (
    p_quote_id,
    v_quote.workspace_id,
    'send_link',
    p_staff_id,
    v_quote.version,
    '發送確認連結，有效期 ' || p_expires_in_days || ' 天'
  );

  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'expires_at', v_expires_at,
    'quote_code', v_quote.code
  );
END;
$$;


-- =====================================================
-- 5. 建立客戶確認的函數（公開使用）
-- =====================================================

CREATE OR REPLACE FUNCTION confirm_quote_by_customer(
  p_token text,
  p_name text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote record;
BEGIN
  -- 查找有效的報價單
  SELECT * INTO v_quote
  FROM public.quotes
  WHERE confirmation_token = p_token
    AND confirmation_status = 'pending'
    AND confirmation_token_expires_at > now();

  IF v_quote IS NULL THEN
    -- 檢查是否已確認
    SELECT * INTO v_quote FROM public.quotes WHERE confirmation_token = p_token;
    IF v_quote IS NOT NULL AND v_quote.confirmation_status IN ('customer_confirmed', 'staff_confirmed', 'closed') THEN
      RETURN json_build_object('success', false, 'error', '此報價單已確認', 'already_confirmed', true);
    END IF;
    RETURN json_build_object('success', false, 'error', '確認連結無效或已過期');
  END IF;

  -- 更新報價單
  UPDATE public.quotes
  SET
    confirmation_status = 'customer_confirmed',
    confirmed_at = now(),
    confirmed_by_type = 'customer',
    confirmed_by_name = p_name,
    confirmed_by_email = p_email,
    confirmed_by_phone = p_phone,
    confirmed_version = version,
    confirmation_ip = p_ip_address,
    confirmation_user_agent = p_user_agent,
    confirmation_notes = p_notes,
    confirmation_token = NULL, -- 清除 token
    updated_at = now()
  WHERE id = v_quote.id;

  -- 記錄日誌
  INSERT INTO public.quote_confirmation_logs (
    quote_id,
    workspace_id,
    action,
    confirmed_by_type,
    confirmed_by_name,
    confirmed_by_email,
    confirmed_by_phone,
    confirmed_version,
    ip_address,
    user_agent,
    notes
  ) VALUES (
    v_quote.id,
    v_quote.workspace_id,
    'customer_confirmed',
    'customer',
    p_name,
    p_email,
    p_phone,
    v_quote.version,
    p_ip_address,
    p_user_agent,
    p_notes
  );

  RETURN json_build_object(
    'success', true,
    'quote_code', v_quote.code,
    'quote_name', v_quote.name,
    'confirmed_at', now()
  );
END;
$$;


-- =====================================================
-- 6. 建立業務確認的函數
-- =====================================================

CREATE OR REPLACE FUNCTION confirm_quote_by_staff(
  p_quote_id text,
  p_staff_id uuid,
  p_staff_name text,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote record;
BEGIN
  -- 取得報價單
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;

  IF v_quote IS NULL THEN
    RETURN json_build_object('success', false, 'error', '報價單不存在');
  END IF;

  IF v_quote.confirmation_status IN ('customer_confirmed', 'staff_confirmed', 'closed') THEN
    RETURN json_build_object('success', false, 'error', '報價單已確認', 'already_confirmed', true);
  END IF;

  -- 更新報價單
  UPDATE public.quotes
  SET
    confirmation_status = 'staff_confirmed',
    confirmed_at = now(),
    confirmed_by_type = 'staff',
    confirmed_by_name = p_staff_name,
    confirmed_by_staff_id = p_staff_id,
    confirmed_version = version,
    confirmation_notes = p_notes,
    confirmation_token = NULL, -- 清除任何待確認的 token
    confirmation_token_expires_at = NULL,
    updated_at = now()
  WHERE id = p_quote_id;

  -- 記錄日誌
  INSERT INTO public.quote_confirmation_logs (
    quote_id,
    workspace_id,
    action,
    confirmed_by_type,
    confirmed_by_name,
    confirmed_by_staff_id,
    confirmed_version,
    notes
  ) VALUES (
    p_quote_id,
    v_quote.workspace_id,
    'staff_confirmed',
    'staff',
    p_staff_name,
    p_staff_id,
    v_quote.version,
    p_notes
  );

  RETURN json_build_object(
    'success', true,
    'quote_code', v_quote.code
  );
END;
$$;


-- =====================================================
-- 7. 撤銷確認的函數
-- =====================================================

CREATE OR REPLACE FUNCTION revoke_quote_confirmation(
  p_quote_id text,
  p_staff_id uuid,
  p_staff_name text,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote record;
BEGIN
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;

  IF v_quote IS NULL THEN
    RETURN json_build_object('success', false, 'error', '報價單不存在');
  END IF;

  IF v_quote.confirmation_status NOT IN ('customer_confirmed', 'staff_confirmed') THEN
    RETURN json_build_object('success', false, 'error', '報價單尚未確認');
  END IF;

  -- 撤銷確認
  UPDATE public.quotes
  SET
    confirmation_status = 'draft',
    confirmed_at = NULL,
    confirmed_by_type = NULL,
    confirmed_by_name = NULL,
    confirmed_by_email = NULL,
    confirmed_by_phone = NULL,
    confirmed_by_staff_id = NULL,
    confirmed_version = NULL,
    confirmation_ip = NULL,
    confirmation_user_agent = NULL,
    confirmation_notes = NULL,
    updated_at = now()
  WHERE id = p_quote_id;

  -- 記錄日誌
  INSERT INTO public.quote_confirmation_logs (
    quote_id,
    workspace_id,
    action,
    confirmed_by_staff_id,
    confirmed_by_name,
    notes
  ) VALUES (
    p_quote_id,
    v_quote.workspace_id,
    'revoked',
    p_staff_id,
    p_staff_name,
    p_reason
  );

  RETURN json_build_object('success', true);
END;
$$;


-- =====================================================
-- 8. 授予必要權限
-- =====================================================

-- 公開 API 需要的函數（客戶確認用）
GRANT EXECUTE ON FUNCTION confirm_quote_by_customer TO anon;


COMMIT;
