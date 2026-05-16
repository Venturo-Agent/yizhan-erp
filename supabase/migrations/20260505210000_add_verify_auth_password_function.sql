-- 為 validate-login API 提供「只驗證密碼、不建立 session」的能力
-- 避免 API 層與 client 端雙重呼叫 signInWithPassword
CREATE OR REPLACE FUNCTION public.verify_auth_password(
  p_user_id uuid,
  p_password text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_encrypted_password text;
BEGIN
  SELECT encrypted_password INTO v_encrypted_password
  FROM auth.users
  WHERE id = p_user_id;

  RETURN v_encrypted_password IS NOT NULL
    AND crypt(p_password, v_encrypted_password) = v_encrypted_password;
END;
$$;
