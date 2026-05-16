-- workspace_integrations：per-workspace API 整合設定
-- William 拍板 2026-05-11：未來 venturo-aierp 是「API 整合平台」、幫客戶串接 amadeus / passport_ocr /
-- line_oa / 其他 third-party、每個 workspace 各自存自己的 API key、不再用 env 共用
--
-- 加密：config 內的敏感欄位（api_key / api_secret / access_token 等）
-- 在應用層用 AES-256-GCM 加密（master key 在 env：VENTURO_INTEGRATION_ENCRYPTION_KEY）
-- DB 只看到 envelope { ciphertext, iv, tag, v }、漏 DB 也拿不到明文
--
-- 第一批 integration_code（規格、不是 enum、好擴充）：
--   'amadeus_flight'  Amadeus 航班搜尋 API
--   'passport_ocr'    護照辨識 OCR
--   'line_oa'         LINE 官方帳號（替代既有 env）
-- 未來陸續加：billings / sms / email / kkday / agoda / ...

BEGIN;

CREATE TABLE IF NOT EXISTS public.workspace_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  integration_code text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (workspace_id, integration_code)
);

CREATE INDEX IF NOT EXISTS idx_wi_workspace_code
  ON public.workspace_integrations(workspace_id, integration_code);

CREATE INDEX IF NOT EXISTS idx_wi_enabled
  ON public.workspace_integrations(workspace_id, enabled)
  WHERE enabled = true;

-- ============ RLS ============
-- 設計：RLS 只擋跨租戶讀取
-- 寫入由 API route 用 service role + requireCapability('workspaces.write') 守
-- （避免普通 user 透過 RLS 直接 INSERT 自己設 API key）
ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wi_select ON public.workspace_integrations;
CREATE POLICY wi_select ON public.workspace_integrations FOR SELECT
  USING (workspace_id = public.get_current_user_workspace());

-- 不開 INSERT/UPDATE/DELETE policy 給 authenticated、強制走 API route + service role
-- 這樣只有平台管理員（有 workspaces.write capability）能改 integration 設定

-- ============ updated_at trigger ============
DROP TRIGGER IF EXISTS wi_set_updated_at ON public.workspace_integrations;
CREATE TRIGGER wi_set_updated_at
  BEFORE UPDATE ON public.workspace_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMIT;

NOTIFY pgrst, 'reload schema';
