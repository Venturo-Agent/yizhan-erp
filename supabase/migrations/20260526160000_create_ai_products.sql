-- ════════════════════════════════════════════════════════════════
-- AI 商品主檔（ai_products）— 2026-05-26 William 拍板
-- ════════════════════════════════════════════════════════════════
-- 為什麼：
--   1. 客戶要在 AI Hub 自助「上架商品」、讓 AI 客服查得到（RAG 知識庫）
--   2. 商品要有自己乾淨的「正本表」（一欄一個欄位）、不直接塞進 knowledge_chunks
--      一段文字裡 —— 未來才能重複用（官網展示 / 報表 / 改價）
--   3. 投影機制：存檔時由 API 把商品欄位拼成自然語言 + 結構化 metadata、
--      upsert 一筆 knowledge_chunks（chunk_type='product'）給 AI 客服檢索。
--      knowledge_chunk_id 連回那筆投影、編輯 / 下架時同步。
--   4. 「先分開、預留未來跟 /websites/products（官網展示）合併」——
--      這張表設計成中性商品主檔、未來可加 marketing_* 欄位掛官網展示、
--      不綁死只服務 AI。
-- 紅線對齊：
--   - 紅線 H：RLS 走 setup_workspace_scoped_rls（4 條 policy 全過 workspace_id）
--   - 紅線 B：created_by / updated_by FK 指 employees(id)、ON DELETE SET NULL
--   - P020：所有 FK 建 index
-- ════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- 商品名稱
  contents TEXT,                               -- 內容物
  price NUMERIC(12, 2),                        -- 價格（金額、幣別分開存）
  currency TEXT NOT NULL DEFAULT 'TWD',        -- 幣別
  description TEXT,                             -- 說明
  valid_from DATE,                             -- 販賣期間：起（日期選擇器）
  valid_to DATE,                               -- 販賣期間：止（日期選擇器）
  validity_note TEXT,                          -- 時效備註（彈性文字、如「購買後 180 天內啟用」）
  is_active BOOLEAN NOT NULL DEFAULT true,     -- 上架 / 下架
  knowledge_chunk_id UUID REFERENCES public.knowledge_chunks(id) ON DELETE SET NULL,
                                               -- 投影到 RAG 的那張知識片段、編輯 / 下架時同步
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,                      -- 軟刪（不真 DELETE）
  CONSTRAINT ai_products_valid_date_check CHECK (
    valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from
  ),
  CONSTRAINT ai_products_currency_check CHECK (
    currency IN ('TWD', 'USD', 'JPY', 'EUR', 'CNY', 'HKD')
  ),
  CONSTRAINT ai_products_price_nonneg_check CHECK (
    price IS NULL OR price >= 0
  )
);

COMMENT ON TABLE public.ai_products IS
  '客戶在 AI Hub 自助上架的商品主檔。存檔時 API 投影一筆 knowledge_chunks（chunk_type=product）供 AI 客服 RAG 檢索。未來可加 marketing_* 欄位與 /websites/products 官網展示合併。';

-- FK / 常用查詢 index（P020）
CREATE INDEX IF NOT EXISTS idx_ai_products_workspace
  ON public.ai_products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_products_active
  ON public.ai_products(workspace_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_products_chunk
  ON public.ai_products(knowledge_chunk_id);
CREATE INDEX IF NOT EXISTS idx_ai_products_created_by
  ON public.ai_products(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_products_updated_by
  ON public.ai_products(updated_by);

-- 紅線 H：workspace 隔離 RLS（4 條 policy 全過 workspace_id = get_current_user_workspace()）
CALL public.setup_workspace_scoped_rls('ai_products');

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION public.set_ai_products_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_products_updated_at ON public.ai_products;
CREATE TRIGGER trg_ai_products_updated_at
  BEFORE UPDATE ON public.ai_products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ai_products_updated_at();

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Rollback（萬一爆炸、複製貼上跑）
-- ════════════════════════════════════════════════════════════════
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_ai_products_updated_at ON public.ai_products;
-- DROP FUNCTION IF EXISTS public.set_ai_products_updated_at();
-- DROP TABLE IF EXISTS public.ai_products;   -- 注意：會連帶刪掉所有已上架商品正本
-- COMMIT;
