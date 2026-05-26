# UI 盤點：`/setup/[token]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(public)/setup/[token]/page.tsx`
> 頁面類型：公開頁（對客 Magic Link 一次性設定頁、接 API、走 morandi token）

## 一句話用途
客戶收到漫途寄的一次性設定連結進來、不需登入（token 即 auth）、verify 後依 integration 定義動態渲染設定表單（API key 等）、submit 後加密存入、顯示成功。

## Layout 骨架
- **頁面框架**：自刻 `div`（`bg-morandi-background` 全屏 + max-w-2xl 居中、多卡片堆疊）
- **頁首**：置中 header（Lock icon + 「安全的一次性設定連結」+ integration 名 + workspace 名）
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 「儲存設定」| 🔴 自刻 `<button>` | n/a | `w-full py-3` | Loader2（submitting）| `bg-morandi-gold text-white hover:bg-morandi-gold/90` | 🔴 手刻 button（有 disabled 防連點 ✅）|

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 動態欄位（text/password/url）| 🔴 自刻 `<input>` | text/password | `border-border rounded-lg` focus `border-morandi-gold` | 🔴 手刻 input（未用 `<Input>`）|

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 無 | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 動態欄位（type=checkbox）| 🔴 原生 `<input type=checkbox>` | 🔴 原生 checkbox（`w-4 h-4 rounded border-border`、未用共用 Checkbox）|

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 「影響的功能」`<ul>` | 一般 | 無 | 無 | 條件渲染 | ✅ |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 必填星號 `*` | 自刻 span | 文字 | 🔴 `text-morandi-red` | 🔴 美術色（必填標記用 status-danger 較對）|

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 載入 | Loader2 | `size={20}` | morandi-secondary |
| token 無效 | XCircle | `size={48}` | 🔴 `text-morandi-red` |
| 設定成功 | CheckCircle2 | `size={48}` | 🔴 `text-morandi-green` |
| header 安全鎖 | Lock | `size={14}` | morandi-muted |
| 提交 loading | Loader2 | `size={16}` | white |
| （未用 ExternalLink、有 import）| ExternalLink | — | — |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 說明卡 / 表單卡 / 錯誤卡 / 成功卡 | 自刻 `bg-card border-border` | `rounded-xl` | `shadow-sm` | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入 | 自刻 Loader2 + 「載入中⋯」| 🟡 對客頁自刻（非 ModuleLoading）|
| token 無效 | 自刻 XCircle 卡（🔴 morandi-red）| 🔴 美術色 |
| 提交成功 | 自刻 CheckCircle2 卡（🔴 morandi-green）| 🔴 美術色 |
| 提交錯誤 | 自刻 🔴 `bg-morandi-red/10 text-morandi-red` 條 | 🔴 美術色 |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **美術色當語意色（系統性）**：token 無效 / 必填星號 / 提交錯誤條全用 `morandi-red`（語意 danger 應走 `status-danger`）；設定成功用 `morandi-green`（語意 success 應走 `status-success`）。與 `/pay/[token]` 同款病、屬 UI 紅線範圍。
- 🔴 **手刻 button + 手刻 input + 原生 checkbox**：未走共用 `<Button>` / `<Input>` / `<Checkbox>`。屬 ERP 內部該統一範疇。
- 🔴 **用 `bg-morandi-background`**：其他公開頁多用 `bg-morandi-cream` / `bg-morandi-container/30`、此頁用 `morandi-background`（token 不一致、需確認該 token 是否存在於 tokens.css）。
- 🟡 import `ExternalLink` 但未使用（dead import、清理層面）。
- ✅ 提交按鈕 `disabled={submitting}` 防連點；卡片結構走 token 圓角陰影。

## 備註
- 這是「ERP 內部該統一」的對客功能頁（integration magic link）— 走 morandi 是對的、但綠/紅語意色 + 手刻表單元件該修。
- token 失效原因走 `REASON_LABEL` 常數（中央化）。
- 結論：**建議納入統一修復**：(1) morandi-green/red 語意處 → status token；(2) 手刻 button/input/checkbox → 共用組件；(3) 清掉未用的 ExternalLink import；(4) 確認 `morandi-background` token 一致性。
