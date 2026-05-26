# UI 盤點：`/pay/mock/[token]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(public)/pay/mock/[token]/page.tsx`
> 頁面類型：公開頁（對客 mock 刷卡頁、Phase 1 純 UI demo、走 morandi token 但仿永豐 EPOS 版型）

## 一句話用途
Phase 1 假刷卡頁：客戶從付款 Dialog 選永豐金流後跳到這裡、填假卡號/有效期/CVV/持卡人、按確認付款（後端 mock 把交易標 captured）、顯示成功畫面。Phase 2 會換成永豐 EPOS 真實頁。

## Layout 骨架
- **頁面框架**：自刻 `div`（`bg-morandi-container/30` 全屏 + max-w-md 卡片堆疊：header / 訂單資訊 / 刷卡表單）
- **頁首**：卡片式 header（morandi-gold 直條 + 「線上付款（永豐金流）」+ 「Venturo ERP × SinoPac Bank」副標）
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 「確認付款」| 🔴 自刻 `<button type=submit>` | n/a | `w-full py-2.5` | Lock / Loader2 | `bg-morandi-gold hover:bg-morandi-gold-hover text-white` | 🔴 手刻 button（有 disabled 防連點 ✅）|

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 卡號 | 🔴 自刻 `<input>` | text | `border-input bg-background` font-mono | 🔴 手刻 |
| 有效期限 | 🔴 自刻 `<input>` | text | 同上 | 🔴 手刻 |
| 安全碼 CVV | 🔴 自刻 `<input>` | text | 同上 | 🔴 手刻 |
| 持卡人姓名 | 🔴 自刻 `<input>` | text | 同上 | 🔴 手刻 |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 無 | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 訂單資訊 / 成功明細（自刻 flex justify-between 行）| 一般 | 無 | 無 | n/a | ✅ morandi token |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 無（成功用大 icon 圓底、非 badge）| — | — | — | — |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 載入 | Loader2 | `w-8 h-8` | morandi-gold |
| 載入失敗 | AlertCircle | `w-12 h-12` | ✅ `text-status-danger` |
| 成功 | CheckCircle2 | `w-10 h-10` | ✅ `text-status-success`（圓底 `bg-status-success-bg`）|
| 信用卡標題 | CreditCard | `w-4 h-4` | morandi-gold |
| 提交按鈕 | Lock / Loader2 | `w-4 h-4` | white |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| header / 訂單 / 表單三段拼接卡 | 自刻 `bg-card border-border` | `rounded-t-xl`/`rounded-b-xl` | 無 | ✅ |
| 成功明細卡 | 自刻 `bg-morandi-container/40` | `rounded-lg` | 無 | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入 | 自刻 Loader2 置中 | 🟡 對客頁自刻（非 ModuleLoading）|
| 載入失敗 | 自刻 AlertCircle 卡（✅ status-danger）| ✅ |
| 提交成功 | 自刻 CheckCircle2 圓底（✅ status-success）| ✅ |
| 表單錯誤 | 自刻 ✅ `bg-status-danger-bg text-status-danger` 條 | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **手刻 button + 4 個手刻 input**：刷卡表單未走共用 `<Button>` / `<Input>`。屬 ERP 內部可統一範疇（但 Phase 2 會整頁被永豐 EPOS iframe 取代、修值待評估）。
- ✅ **語意色用對了**：成功 `status-success`、錯誤 `status-danger`（比 `/pay/[token]` 用 morandi-green/red 乾淨）— 這頁是後期寫的、已對齊 UI 紅線。
- ✅ 提交按鈕 `disabled={submitting}` 防連點。
- ✅ 明確走 venturo CIS、不用永豐銀行品牌色（註解自證「走 venturo CIS、不用永豐銀行品牌色」）— 符合 UI 紅線「不借第三方品牌色當主色」。
- 假表單欄位（卡號/CVV）純 demo、不真驗證不真扣款。

## 備註
- 註解明寫 Phase 2 會替換成永豐 EPOS URL iframe、此 mock 頁會消失 → 修統一的投報率低、可低優先。
- 結論：**語意色已對齊**；唯一可改是手刻表單→共用組件、但因頁面短命（Phase 2 廢）、建議低優先或不改。
