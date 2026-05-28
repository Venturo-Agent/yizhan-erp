# UI 紀律紅線（2026-05-23 William 拍板）

> 主檔索引在 `CLAUDE.md` § 紅線清單 UI / `docs/rules/red-lines.md` § UI 紀律紅線。
> 這份是完整 design token 對照表 + status badge 改寫範例。

**所有新 UI 必比照公司 venturo CIS、不准用 Tailwind 預設色**。

---

## ❌ 禁用

- `bg-red-*` / `bg-green-*` / `bg-blue-*` / `bg-yellow-*` / `bg-purple-*` 等 Tailwind 預設色
- `text-red-{50..900}` / `text-green-{50..900}` / `text-blue-{50..900}` 等預設色
- `border-red-200` / `border-green-200` 等預設色 border
- 永豐 / 第三方品牌色（譬如 EPOS 紅 `bg-red-600`）— 即使是品牌色、要走 venturo 主色 `morandi-gold`

---

## ✅ 強制走 design token

| 用途        | Token                                                                    | 範例                |
| ----------- | ------------------------------------------------------------------------ | ------------------- |
| 主品牌色    | `morandi-gold` / `morandi-gold-hover` / `morandi-gold-light`             | 主要按鈕、強調區塊  |
| 次品牌色    | `morandi-primary` / `morandi-secondary` / `morandi-muted`                | 文字                |
| 中性 / 背景 | `morandi-container` / `morandi-cream` / `bg-card` / `bg-background`      | 卡片 / 區塊         |
| **成功**    | `text-status-success` / `bg-status-success-bg`                           | 付款成功 / 審核通過 |
| **危險**    | `text-status-danger` / `bg-status-danger-bg` / `border-status-danger/30` | 錯誤 / 拒絕 / 退款  |
| **警告**    | `text-status-warning` / `bg-status-warning-bg`                           | 過期 / 待補資料     |
| **資訊**    | `text-status-info` / `bg-status-info-bg`                                 | 一般提示            |

Token 定義：`src/styles/tokens.css`（不要散刻、改 token 自動影響全站）。

---

## Status badge 對應

舊 code 散落 status 寫法 → 改成 design token：

- 成功 `bg-green-50/100 text-green-600/700` → `bg-status-success-bg text-status-success`
- 危險 `bg-red-50 text-red-600/700` → `bg-status-danger-bg text-status-danger`
- 資訊 `bg-blue-50/100 text-blue-700` → `bg-status-info-bg text-status-info`
- 警告 `bg-yellow-* text-yellow-*` → `bg-status-warning-bg text-status-warning`
- 未讀紅點 `bg-red-500` → `bg-status-danger`

---

## Channel badge **例外**（保留品牌色、不算硬編碼）

W 拍板 2026-05-23：社群通訊軟體的品牌色是用戶熟悉的辨識色、屬於「**識別色**」不是「**狀態色**」、保留：

- LINE badge：`bg-green-100 text-green-700`（綠）
- FB badge：`bg-blue-100 text-blue-700`（藍）
- IG badge：`bg-pink-100 text-pink-700`（粉）
- 未來新 channel（WhatsApp / Telegram / Discord）也走自己品牌色

⚠️ 例外**僅限**社群 / 通訊產品 channel badge、其他「品牌色借當主色」（譬如永豐紅當付款頁主色）仍違規。

---

## audit / 偵測

加進 `scripts/check-standards.sh`（未來）：grep `bg-(red|green|blue|yellow|purple)-` / `text-(red|green|blue|yellow|purple)-[0-9]` 散落、commit 前擋。

---

## 違反成本

跟 type error 同級、commit 前自己 audit、不准 PR 帶這種變動上 main。

譬喻：每件衣服都要送公司 CIS 部門過審、不是隨便買花襯衫穿來上班。
