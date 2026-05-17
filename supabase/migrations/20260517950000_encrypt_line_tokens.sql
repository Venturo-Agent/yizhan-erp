-- ============================================================
-- LINE token encryption: 加密欄位升級
-- 2026-05-17
--
-- 策略：新增 _encrypted 欄位，code 端用 AES-256-GCM 加密後存入；
--       舊明文欄位保留作 rollback 緩衝，code 讀取優先解密欄，
--       fallback 明文（既有已開通 workspace 不斷線）。
--       全部 workspace 重新 provision 後、下一個 migration 可清空明文欄。
-- ============================================================

ALTER TABLE workspace_line_settings
  ADD COLUMN IF NOT EXISTS channel_access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS channel_secret_encrypted TEXT;

COMMENT ON COLUMN workspace_line_settings.channel_access_token_encrypted IS
  'AES-256-GCM envelope（base64 iv+tag+ciphertext）；明文欄 channel_access_token 保留緩衝期、全部 workspace 重 provision 後可清空。';

COMMENT ON COLUMN workspace_line_settings.channel_secret_encrypted IS
  'AES-256-GCM envelope（base64 iv+tag+ciphertext）；明文欄 channel_secret 保留緩衝期、全部 workspace 重 provision 後可清空。';
