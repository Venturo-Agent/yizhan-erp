-- =====================================================
-- 價格鏈實作：報價確認時自動同步售價到 Tour
-- 2026-02-24
-- =====================================================

BEGIN;

-- =====================================================
-- 1. 修改客戶確認函數 - 加入價格同步
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
  v_selling_price_per_person numeric;
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

  -- 🆕 價格鏈：計算每人售價並同步到 Tour
  IF v_quote.tour_id IS NOT NULL AND v_quote.total_amount IS NOT NULL AND v_quote.number_of_people IS NOT NULL AND v_quote.number_of_people > 0 THEN
    v_selling_price_per_person := v_quote.total_amount / v_quote.number_of_people;
    
    UPDATE public.tours
    SET 
      selling_price_per_person = v_selling_price_per_person,
      updated_at = now()
    WHERE id = v_quote.tour_id;
  END IF;

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
-- 2. 修改業務確認函數 - 加入價格同步
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
  v_selling_price_per_person numeric;
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

  -- 🆕 價格鏈：計算每人售價並同步到 Tour
  IF v_quote.tour_id IS NOT NULL AND v_quote.total_amount IS NOT NULL AND v_quote.number_of_people IS NOT NULL AND v_quote.number_of_people > 0 THEN
    v_selling_price_per_person := v_quote.total_amount / v_quote.number_of_people;
    
    UPDATE public.tours
    SET 
      selling_price_per_person = v_selling_price_per_person,
      updated_at = now()
    WHERE id = v_quote.tour_id;
  END IF;

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

COMMIT;