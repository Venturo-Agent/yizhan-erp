-- ============================================================
-- 砍 knowledge_tags（dead code、0 caller、0 production row）
--
-- 來龍去脈：
--   - 2026-05-19 建立、但從未在任何 UI 或 API 中被參考
--   - types.ts 有殘留（regen 時會消失）
--   - 確認無 caller、即可安全移除
--
-- 此 migration 為「寫好待 apply」狀態。
-- Apply 前請先確認：
--   - production 確實 0 row：SELECT COUNT(*) FROM knowledge_tags;
--   - types.ts regenerated 後無殘留
--
-- Reverse（測試用）：
--   CREATE TABLE public.knowledge_tags (
--     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--     workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
--     category    text NOT NULL,
--     code        text NOT NULL,
--     label       text NOT NULL,
--     sort_order  integer DEFAULT 0,
--     created_at  timestamptz DEFAULT now(),
--     updated_at  timestamptz DEFAULT now(),
--     created_by  uuid REFERENCES public.employees(id),
--     updated_by  uuid REFERENCES public.employees(id),
--     CONSTRAINT knowledge_tags_ws_category_code_unique
--       UNIQUE (workspace_id, category, code)
--   );
--   CREATE INDEX knowledge_tags_ws_idx ON public.knowledge_tags(workspace_id);
--
-- Apply（Claude MCP）：
--   cd yizhan-erp && supabase db push --project-ref aawrgygqgemgqssflfrx
-- ============================================================

BEGIN;

-- 1. 移除 FK constraints（SOP：先斷鏈再砍表）
ALTER TABLE public.knowledge_base
  DROP CONSTRAINT IF EXISTS knowledge_base_tag_id_fkey;

-- 2. 砍 table
DROP TABLE IF EXISTS public.knowledge_tags CASCADE;

-- 3. types.ts 會在下次 regen 時自動移除（不在此寫入）
-- 確認方式：grep -n "knowledge_tags" src/lib/supabase/types.ts 應無輸出

COMMIT;