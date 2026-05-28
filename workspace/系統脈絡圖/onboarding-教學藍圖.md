# Venturo ERP — Onboarding 教學藍圖

> 給新租戶用的「跟著走一遍」式產品教學總藍圖。
> 撰寫：Logan（2026-05-28）｜ William 拍板分階段執行
> 之後也可以變成「給客戶的功能說明書」雛形（賣 SaaS 用得到）

---

## 設計原則

1. **氣泡引導**（NextStepjs）+ 自動觸發（依路由 / dialog 開啟 / 上一段完成）
2. **無縫接續**（一段完 → 自動接續下一段，user 不用自己再點）
3. **動態跟著畫面**（沒開的功能不指、避免指空；UI 改了導覽不會壞）
4. **共用導覽控制器**（`src/components/tour/TourProvider.tsx`）
5. **腳本分散**：每個 tour 一個 `.tsx` 在 `src/lib/tours/`
6. **永遠走 morandi 莫蘭迪卡片**（自訂 `TourCard`、不用 Tailwind 預設色）

---

## ✅ 已完成（按時間順序）

### Phase 1（5/27）— 側邊欄基礎
- **sidebar tour**：登入首頁自動跑、動態跟權限介紹側邊欄 17 個模組
- 個人偏好齒輪 vs 公司設定 兩個「設定」講清楚

### Phase 2（5/28 上午）— 公司設定
- **settings tour**：公司識別 / 聯絡 / Logo / 大小章 / 旅行屬性
- 動態錨點過濾（UI 改了不指空）
- 自訂 instant scroll（避免平滑捲動跟高亮框不同步）
- 待搬遷：結帳/匯款/稅率/銀行 → 財務設定（記錄在 `公司設定-重構待辦.md`）

### Phase 3（5/28 中）— 旅遊團 + 開團
- **tours tour**：工具列 / 5 分頁 / 新增專案
- **open-tour tour**：開團表單 5 步（資訊 / 類型 / 目的地 / 訂單 / 建立）
- **open-proposal tour**：提案 / 模板表單
- **無縫接續**：tours 完成 → 自動開 dialog → open-tour 跑
- 建好團 → toast 提示「點報名加客人」

---

## ⬜ 待做（10 個 item）

### 🐛 A. Bug + UI 改（最快）

| # | Item | 檔案 |
|---|------|------|
| A1 | 訂單面板「設定」按鈕壞掉 | OrderMembersDialog / OrderMembersExpandable.toolbar |
| A2 | 護照辨識 Emoji 拿掉（⏳） | `PassportUploadZone.tsx:161` |
| A3 | 護照批次辨識 OCR 整段移除 | AddMemberDialog 移除引用、PassportUploadZone 變孤兒 |

### 🔧 B. UX 改

| # | Item | 待探查 |
|---|------|--------|
| B1 | 請款單三件套：①供應商找不到時跳新增 dialog（不無聲建、避免錯字污染表）②代墊人下拉 ③單價/數量 | `src/app/(main)/finance/requests/` |

### 📚 C. 教學（每塊 1 個 tour）

| # | Item | 觸發 | 重點 |
|---|------|------|------|
| C1 | 訂單 tab | 進 `/tours/{code}?tab=orders` | 一團多訂單 + 4 功能：編輯聯絡人 / 成員 / 帳單合約 / 設定 |
| C2 | 成員管理 dialog | 點訂單「成員」按鈕 | 手動新增（OCR 已移除後）；點成員 → PNR 配對 |
| C3 | 收款教學 | 點訂單「收款」按鈕 | 5 點：選團 / 選單 / 方式日期 / 明細 / 備註 |
| C4 | 請款單教學 | 進請款單新增頁 | 流程跟 C3 類似 |
| C5 | 人資管理 | `/hr` | 4 點：職務管理 → 功能權限展開（讀取/寫入）→ 旅遊團權限對應「團控/業務」→ 員工列表新增（不點進去） |
| C6 | 財務出納 | `/finance/treasury/disbursement` | 4 點：新增 → 選出帳帳戶儲存 → 預覽列印 → 實際出帳一旦完成不可改 |
| C7 | 公司收支 | 待探查 | 看教學風格、要做（William 5/28 加） |

### 🐛 D. 財務設定 - 銀行帳戶（UI 改 + 教學）

| # | Item | 動作 |
|---|------|------|
| D1 | 新增銀行帳戶 UI | 拿掉「代碼」「名稱」欄位（Sandy 處理）；「銀行全名」placeholder 改「銀行」；加「分行」「戶名」欄位 |
| D2 | 帳戶功能設定 | 教學提醒「出帳帳戶」勾選確認；UI 拿掉「預設帳戶」欄位 |
| D3 | 跨行匯款手續費 | 教學說明會自動產生；提醒確認公司跨行手續費；UI 拿掉「取消勾選」「充值帳戶匯款」小字 |

### 🐛 E. 財務設定 - 收款方式（UI 改 + 教學）

| # | Item | 動作 |
|---|------|------|
| E1 | 名稱自由編輯 | 教學提醒名稱可自由編輯方便辨識 |
| E2 | 按鈕優化 | 編輯內「開放自助收款」按鈕拿掉（跟外面重複）；「收款方式」的「說明」「付款資訊」刪掉 |
| E3 | 清款單設定教學 | 含金流、團體請款類型新增 |
| E4 | 獎金設定 | ❌ William 拍板不用教 |

---

## 設計細節（給未來補的人）

### TourProvider 多 tour 機制
- 目前 5 個 tour：`sidebar` / `settings` / `tours` / `open-tour` / `open-proposal`
- 加新 tour：寫 `src/lib/tours/<name>-tour.tsx` → TourProvider 加 import + steps spread
- 觸發機制：依 pathname / dialog open / 上一個 tour 完成 event（`venturo:open-tour-dialog` 已建）

### data-tutorial 錨點命名
- 模組級：`nav-{href 第一段}`
- 區塊級：`{section}-{name}`（如 `tours-header`、`open-tour-info`）
- 共用元件：透過 prop 傳（如 `ResponsiveHeader.rootDataTutorial`）

### 共用 TourCard 細節
- 走 morandi 色票
- `side='right-top'` 自動往上推（避免貼底切；個人區用）
- `data-tour-card` 標記（讓 dialog 不誤關）

### 自訂滾動（避免平滑捲動跟高亮框不同步）
- TourProvider 的 `noInViewScroll={true}` + `onStepChange` 自己 instant scroll
- 只對「不在視野」的元素 scroll

---

## 完成標記原則

- ✅ = 已 commit、type-check 綠、William 驗收 OK
- 🟡 = 進行中
- ⬜ = 還沒做

backlog 跑完之後、這份藍圖也就是給客戶的「跟著走一遍」說明書雛形。
