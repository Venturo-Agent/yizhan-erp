---
title: 簽約 → 客戶 setup gate 設計 spec
created: 2026-05-15
status: spec / 待實作
owner: Logan
related: [[2026-05-15-出納單完整重構-spec]]
---

# Setup Gate（客戶完成設定前 redirect / banner）

## 背景

William 2026-05-15 13:09 Telegram 拍板：
> 未來跟我們簽約的公司、我們會先傳送一個註冊連結（Link）給對方。客戶必須先完成相關設定、後續才有辦法作業、否則系統內很多功能都無法使用。

## 現狀

- 既有 `/setup/[token]` route：給「**特定整合**」（LINE bot / Telegram 等）一次性設定用、不是完整 onboarding wizard
- 既有 `setup-tokens` API：管理整合用的 magic link
- workspaces 表沒有 `setup_completed_at` 之類 flag
- 沒有 onboarding wizard 路由 / UI

## 範圍

### 動的層
- L1：N/A
- L2：N/A
- L3：N/A
- **L4 狀態守門**：workspace level 加「setup_completed」概念
- **L5 DB**：workspaces 表加 setup_completed_at 欄位（或衍生 setup status）
- **L6 SSOT**：setup status 演算法走 `lib/setup/check-status.ts`

### 動的檔
- migration：workspaces 加 setup_completed_at timestamptz nullable
- 新建 `src/lib/setup/check-status.ts`：演算 setup 完成度
- 新建 `src/app/api/setup/status/route.ts`：返回 workspace setup 狀態
- 新建 onboarding wizard 路由：`/setup/onboarding` 或 `/(public)/setup/onboarding/[workspace_token]`
- dashboard layout 加 banner / redirect

## Setup 完成度判斷（draft、依 William 後續補）

workspace 視為「setup_completed」需通過：
1. **基本資料**：name + code + tax_id 都填
2. **銀行帳戶**：bank_accounts where is_active=true AND is_disbursement_eligible=true 至少 1 個
3. **結帳設定**：workspaces.transfer_fee_mode IS NOT NULL
4. **HR 政策**：workspaces.leave_policy + pension_system 都填（已有 default、可放寬）
5. **付款方式**：payment_methods active 至少 1 個
6. **預設出帳日**：workspaces.default_billing_day_of_week IS NOT NULL
7. **員工**：employees active 至少 1 個

任一項缺 → setup_completed_at 保持 NULL、UI 顯示 banner / 入口導向 setup wizard。

## 兩種 gate 強度

**A. 純 banner（推薦先做）**
- dashboard 頂部顯示 banner：「設定尚未完成：⚠ X 項待辦、立即設定」
- 不擋 feature、user 可以照常用
- 適合：剛上線、避免擋既有 workspace

**B. 強制 redirect**
- 訪問 main app 任何頁面 → 檢查 status、未完成 redirect /setup/onboarding
- 例外：/settings/*、/setup/*、/api/setup/* 可訪問
- 適合：新 workspace、強制完成 onboarding 才能用

## Onboarding wizard 設計

新建 `/setup/onboarding/[workspace_token]`（公開、token 驗證）：

```
Step 1：基本資料（公司名、tax_id、地址）
Step 2：上傳 logo / 印章圖檔
Step 3：建第一個銀行帳戶（含 is_disbursement_eligible）
Step 4：設結帳分攤模式（average / unified）+ 預設出帳日
Step 5：選 HR 政策（特休制度 / 資遣費制度）
Step 6：邀請首位員工（建 admin role employee）
Step 7：完成 → workspaces.setup_completed_at = now()
```

每 step 即時存 DB（不要等最後一次性 commit、避免半途斷線丟失）。

## API 設計

```ts
// GET /api/setup/status
// 回：{ completed: boolean, completed_at: string | null, todos: SetupTodo[] }
// SetupTodo: { key, label, done, action_url }

// POST /api/setup/mark-complete
// 把 workspaces.setup_completed_at 設 now()、要求所有 todo done
```

## 工程量

- Phase A 純 banner（不擋）：2-3 hr
  - migration + status API + banner component + 接入 dashboard layout
- Phase B onboarding wizard：1-2 天
  - 7 step wizard + 各 step API + token 驗證

## 跟現有 spec 對齊

- 跟 [[2026-05-15-出納單完整重構-spec]] Phase 2 結帳設定 UI 對接（setup wizard Step 4）
- 跟 [[2026-05-15-bonus-settlement-spec]] HR 政策對接（setup wizard Step 5）
- 跟既有 setup-tokens API 不衝突（不同 token type、可加 type='workspace_onboarding'）

## 不在此 spec 範圍

- 自動發 email / SMS 註冊連結（簽約流程一部分、屬 CRM）
- 多公司同一帳號管理（B2B 經銷商等）
- setup 完成後的「歡迎流程」教學影片 / hint

## 為什麼這次先跳

W 2026-05-15 13:26 「做完吧」、但廠商剛 12:00 上線、強制 redirect 風險高（既有 workspace 都被擋）。
Banner 版實作快、但 UI 衝擊大、且需協調 dashboard layout。
留下次 William 主導時做 wizard 完整流程、這次先 ship P1-P4 出納單功能。
