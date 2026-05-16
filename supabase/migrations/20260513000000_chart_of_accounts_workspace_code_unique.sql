-- ─────────────────────────────────────────────────────────────────────────────
-- B4: chart_of_accounts 補 UNIQUE (workspace_id, code) constraint
--
-- 背景：
--   今晚 pattern audit 發現 chart_of_accounts.code 沒有 unique constraint、
--   只靠前端不撞、人工輸入重複會撞號。
--   PR-2 Phase 2 寫了 generate_account_child_code RPC 防競態、但人工輸入
--   重複還是 DB 不擋、是漏洞。
--
-- 風險評估：
--   - Pre-check 確認：production 326 row、4 workspace、0 重複
--   - 加 UNIQUE 不會擋到任何現存 row
--   - 未來人工輸入重複會被 23505 擋下、配合 translateDbError 給友善訊息
--
-- ⚠️ 紅線檢核：
--   - 不動 RLS / 不動 workspaces 表 ✓
--   - 純加 constraint、不動資料 ✓
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Pre-check：重跑確認（生產可能在 audit 跟 apply 之間變動）
DO $$
DECLARE v_dup int;
BEGIN
  SELECT COUNT(*) INTO v_dup FROM (
    SELECT workspace_id, code, COUNT(*) AS c
    FROM public.chart_of_accounts
    GROUP BY workspace_id, code
    HAVING COUNT(*) > 1
  ) t;

  IF v_dup > 0 THEN
    RAISE EXCEPTION 'chart_of_accounts 有 % 組 (workspace_id, code) 重複、apply 前必須清', v_dup;
  END IF;
END $$;

ALTER TABLE public.chart_of_accounts
  ADD CONSTRAINT chart_of_accounts_workspace_code_unique
  UNIQUE (workspace_id, code);

DO $$
BEGIN
  RAISE NOTICE '✓ B4 完成：chart_of_accounts UNIQUE(workspace_id, code) constraint 補上';
END $$;

COMMIT;
