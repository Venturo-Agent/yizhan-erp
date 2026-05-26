# 全站 UI 普查 — 進度索引

> 目標：91 個路由逐頁盤點所有 UI 元素（按鈕/Input/ComboBox/表格/對話框/標籤/圖示…）、每頁一檔、最後彙整成 HTML「UI 大全」。
> 啟動：2026-05-26（William 拍板「執行」）｜ 模板：`_TEMPLATE.md`
> 狀態：⬜ 待掃 ｜ 🔄 掃描中 ｜ ✅ 已產檔

## 進度總計
- 路由總數：**91**
- 已產檔：**91 / 91** ✅ 全數完成（批次 1-14）
- 彙整階段：產出 `UI-大全.html` 中

### 🚨 第三批重大發現
- **行動版 /app = 完全分岔的第二套設計系統**：深色底 + 藍 #3B82F6 手刻 CSS、0 共用組件、字型也不同（6 頁、4 頁還是 placeholder）
- **三大設計系統並存**：桌面 ERP(morandi 4 主題) / 行動版(藍 dark) / 對客頁(多套獨立 CIS：YONGCHENG canvas / proposal hex / public-* / 認證頁 inline)
- **更多真 bug**：landing `bg-morandi-container/50/50`（卡片背景失效）、app/settings 未定義 class `app-header-btn`（鈕掉樣式）
- **正面範本**：/no-access、/pay/result、workspaces ai-health-tab = 全走 status token、最乾淨、當對齊標竿

### 共通病（最後彙整用、累計）
1. 美術色當語意色（morandi-green/red 表成功/危險）= 全站通病
2. 操作欄三套：ActionCell / 手套 ACTION_BUTTON_BASE / 純手刻 button
3. 編輯圖示混用：Edit2(主流)/Edit/Pencil/SquarePen；圖示尺寸三軌（size={n}/0.95em/w-4 h-4）
4. 狀態 Badge 兩套：共用 StatusBadge vs 各頁手刻 className map
5. 原生控件散落（select/checkbox/radio 沒走共用組件）
6. Tailwind 預設色硬編：orders/todos/workspaces 狀態色（amber/blue/teal/slate/red-500）

### 🔴 病根 / 真 bug（第二批挖出）
- **病根**：黃金標準本人 simple-order-table + 共用 StatusBadge 組件內部，就用 morandi-green/red 當語意色 → 全站抄此源頭
- **真 bug**：`bg-status-danger-bg0`（typo、ai 頁 3 處紅點沒底色）；visas 整頁引用不存在的 morandi 數字階 token（gray-200/blue-100…）→ 靜默失效
- **硬編漸層/hex**：workspaces/[id] 整頁（eslint-disable 壓）、websites/design `bg-[#FDFAF6]`
- **redirect 殘骸**：bot 5 頁 + messaging + settings/platform/websites 部分 = 純轉址、dead code 組件殘留

---

## 批次規劃（按 module 分組、一專員一批）

### 批次 1 — 會計 accounting（11）
- ⬜ /accounting `(main)/accounting/page.tsx`
- ⬜ /accounting/accounts
- ⬜ /accounting/checks
- ⬜ /accounting/opening-balances
- ⬜ /accounting/period-closing
- ⬜ /accounting/vouchers
- ⬜ /accounting/reports
- ⬜ /accounting/reports/balance-sheet
- ⬜ /accounting/reports/general-ledger
- ⬜ /accounting/reports/income-statement
- ⬜ /accounting/reports/trial-balance

### 批次 2 — 財務 finance（7）
- ⬜ /finance
- ⬜ /finance/payments
- ⬜ /finance/requests
- ⬜ /finance/reports
- ⬜ /finance/settings
- ⬜ /finance/treasury/disbursement

### 批次 3 — 人資 hr（7）
- ⬜ /hr
- ⬜ /hr/roles
- ⬜ /hr/organization
- ⬜ /hr/bonus-settlement
- ⬜ /hr/bonus-settlement/[tourId]
- ⬜ /hr/salary-settlement
- ⬜ /hr/salary-settlement/[id]

### 批次 4 — 資料庫 library（6）
- ⬜ /library
- ⬜ /library/customers
- ⬜ /library/customers/[id]
- ⬜ /library/suppliers
- ⬜ /library/attractions
- ⬜ /library/archive-management

### 批次 5 — 共用資料 shared-data（6）
- ⬜ /shared-data
- ⬜ /shared-data/airports
- ⬜ /shared-data/attractions
- ⬜ /shared-data/banks
- ⬜ /shared-data/countries
- ⬜ /shared-data/insurance-grades

### 批次 6 — 旅遊團 + 訂單 + 業務雜項（7）
- ⬜ /tours
- ⬜ /tours/[code]
- ⬜ /tours/[code]/display-editor
- ⬜ /orders
- ⬜ /visas
- ⬜ /calendar
- ⬜ /todos

### 批次 7 — Bot 設定（5）
- ⬜ /bot
- ⬜ /bot/[lineUserId]
- ⬜ /bot/setup
- ⬜ /bot/facebook-setup
- ⬜ /bot/instagram-setup

### 批次 8 — 通訊 + AI（4）
- ⬜ /channels
- ⬜ /channels/[id]
- ⬜ /messaging
- ⬜ /ai

### 批次 9 — 設定 + 平台 + 工作區 + 文件（7）
- ⬜ /settings
- ⬜ /settings/company
- ⬜ /workspaces
- ⬜ /workspaces/[id]
- ⬜ /platform
- ⬜ /platform/aitoearn
- ⬜ /documents

### 批次 10 — 行銷 + 官網（5）
- ⬜ /marketing/website
- ⬜ /marketing/website/[code]
- ⬜ /websites
- ⬜ /websites/design
- ⬜ /websites/products

### 批次 11 — main 雜項（4）
- ⬜ / `(main)/page.tsx`
- ⬜ /dashboard
- ⬜ /login
- ⬜ /no-access

### 批次 12 — 公開頁 public（11）
- ⬜ /p/canvas-demo
- ⬜ /p/tour/[code]
- ⬜ /p/tour/[code]/canvas
- ⬜ /p/tour/[code]/register
- ⬜ /p/fukuoka-family-proposal/[code]
- ⬜ /p/fukuoka-golf-proposal/[code]
- ⬜ /p/samui-proposal/[code]
- ⬜ /pay/[token]
- ⬜ /pay/mock/[token]
- ⬜ /pay/result
- ⬜ /setup/[token]

### 批次 13 — 行動版 app/（6）
- ⬜ /app
- ⬜ /app/dashboard
- ⬜ /app/calendar
- ⬜ /app/orders
- ⬜ /app/more
- ⬜ /app/settings

### 批次 14 — 根層雜項（6）
- ⬜ / `app/page.tsx`（根 landing redirect）
- ⬜ /landing
- ⬜ /change-password
- ⬜ /reset-password
- ⬜ /view/[id]
- ⬜ /public/contract/sign/[code]

---

## 彙整階段（91 頁全掃完後）
- ⬜ 跨頁統計：各 UI 元素的「變體數量」分佈（揪不統一）
- ⬜ 產出 HTML「UI 大全」（每類元素的所有變體並排展示 + 異常標記）
