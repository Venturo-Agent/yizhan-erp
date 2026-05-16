-- =====================================================
-- 縮短報價確認 Token
-- 2025-12-28
-- =====================================================
-- 格式改為：{報價編號}-{6字元驗證碼}
-- 例如：Q000123-Xk9mNp
-- =====================================================

BEGIN;

-- 更新 token 生成函數（生成 6 字元短碼）
CREATE OR REPLACE FUNCTION generate_confirmation_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  i integer;
BEGIN
  -- 生成 6 字元的隨機驗證碼（排除容易混淆的字元）
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;


-- 更新發送確認連結函數（token 改為 報價編號-驗證碼 格式）
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
  v_short_code text;
  v_token text;
  v_quote record;
  v_expires_at timestamptz;
BEGIN
  -- 取得報價單資訊
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;

  IF v_quote IS NULL THEN
    RETURN json_build_object('success', false, 'error', '報價單不存在');
  END IF;

  -- 生成短驗證碼
  v_short_code := generate_confirmation_token();

  -- 組合 token：報價編號-驗證碼
  v_token := v_quote.code || '-' || v_short_code;

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


COMMIT;
