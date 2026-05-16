-- ============================================================================
-- 20260503030000_drop_workspace_modules.sql
--
-- N-002: DROP workspace_modules（0 row、跟 workspace_features 概念重疊）
-- 來源：docs/_followup_backlog.md / SCHEMA_PLAN.md「workspace_modules 0 row、可砍」
-- W 拍板 2026-05-02：「砍掉一張零筆資料死表沒問題」
--
-- 業務概念：「租戶開通了哪些模組」的 SSOT 是 workspace_features (235 row)
-- workspace_modules 是平行死表、從未業務寫入。
-- ============================================================================

DROP TABLE IF EXISTS public.workspace_modules CASCADE;
