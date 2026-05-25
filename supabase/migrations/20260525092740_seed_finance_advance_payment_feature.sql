-- ─────────────────────────────────────────────────────────────────────────────
-- 補開通 finance.advance_payment 分頁 feature 給所有現存 workspace
--
-- 為什麼：
--   5/24 把「代墊」從員工個人資格改成職務權限開關（commit 07b8ca9）、module-tabs.ts
--   的財務系統底下新增 advance_payment 分頁，但漏了同步 seed workspace_features
--   （憲法 8 維度 #8「5 個 SSOT」那個坑：動了 code、漏了 seed migration）。
--
--   職務權限頁的分頁顯示走嚴格 default-deny（src/lib/permissions/hooks.ts isTabEnabled）：
--   workspace_features 沒有 enabled=true 的 row，「可代墊款」開關就不顯示 → 沒人能授予
--   代墊權限 → 請款頁「代墊款人」下拉永遠空的。
--
--   驗證（2026-05-25）：finance.* 其餘 9 個分頁每個都有 8 家 workspace 的 row，
--   唯獨 finance.advance_payment = 0 筆。本 migration 補齊。
--
-- 影響面：
--   - 只補現存 workspace。新 workspace 不受影響——create-tenant-seed.ts 動態遍歷
--     module.tabs 產生 feature_code、會自動帶上 finance.advance_payment。
--   - idempotent（ON CONFLICT DO UPDATE）、可重跑、不破壞既有 row。
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 基準集合：對齊「已開通財務 module（有 finance.payments 分頁 row）」的 workspace。
-- enabled 直接複製各自 finance.payments 的狀態（workspaces 表無軟刪欄位、且 9 家中
-- 有 1 家沒開財務；用 finance.payments 當基準最精準、且尊重已關財務的 workspace、不武斷全開）。
INSERT INTO workspace_features (workspace_id, feature_code, enabled)
SELECT workspace_id, 'finance.advance_payment', enabled
FROM workspace_features
WHERE feature_code = 'finance.payments'
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET enabled = EXCLUDED.enabled;

COMMIT;

-- 非破壞（純 seed）、不需 reverse SQL。
-- 如要關閉某 workspace 的代墊分頁：UPDATE workspace_features SET enabled=false WHERE feature_code='finance.advance_payment' AND workspace_id='<id>';
