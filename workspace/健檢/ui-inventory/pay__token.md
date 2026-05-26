# UI 盤點：`/pay/[token]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(public)/pay/[token]/page.tsx`（含 `PayFormDialog.tsx`、`PaymentDisplayComponents.tsx`、`types.ts`）
> 頁面類型：公開頁（對客自助付款頁、接 API、走 morandi token）

## 一句話用途
客戶從漫途收到付款連結進來、看一個 batch 下所有團員應付明細 + 公司收款帳號 + 歷次付款、勾選要付的人後填匯款資訊（或跳永豐刷卡）送出。

## Layout 骨架
- **頁面框架**：自刻 `div`（`bg-morandi-gold-light/30` 全屏 + max-w-2xl 卡片堆疊）
- **頁首**：卡片式 header（workspace logo 或 Building2 icon + 公司名 + 頁標）
- **分頁**：無（單頁 + 付款 Dialog）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 主「我要付款」CTA | 🔴 自刻 `<button>` | n/a | `w-full py-3` | 無 | `bg-morandi-gold text-white` | 🔴 手刻 button（未用 `<Button>`）|
| Dialog「取消」| 🔴 自刻 `<button>` | n/a | flex-1 py-2 | 無 | border + morandi-secondary | 🔴 手刻 |
| Dialog「我要付款/前往刷卡」| 🔴 自刻 `<button>` | n/a | flex-1 py-2 | Loader2 | `bg-morandi-gold text-white` | 🔴 手刻（有 disabled 防連點 ✅）|

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 付款金額 | 🔴 自刻 `<input type=number>` | number | morandi-gold 底線 | 🔴 手刻 input（未用 `<Input>`）|
| 識別碼（後五碼）| 🔴 自刻 `<input type=text>` | text | `border-border` + focus ring morandi-gold | 🔴 手刻 |
| 匯款日 | 🔴 自刻 `<input type=date>` | date | 同上 | 🔴 手刻 |
| 備註 | 🔴 自刻 `<textarea>` | — | 同上 | 🔴 手刻 |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 收款方式 | 🔴 原生 `<select>` | `border-border` + focus ring morandi-gold | 🔴 原生 select（未用共用 Select 組件）|

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 團員應付明細「勾選要付」| 🔴 原生 `<input type=checkbox>`（在 `MemberRow` label 內）| 🔴 原生 checkbox、色用 morandi-gold |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 團員明細 list（`MemberRow`）| py-2 | 無 | 無（選中 morandi-gold/10 底）| n/a | 🟡 對客頁自刻、走 morandi token |
| 歷次付款 list（`ReceiptHistoryRow`）| py-2 | 無 | 無 | 「尚無付款紀錄」文字 | 🟡 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 填寫付款資訊 | `<Dialog>`（共用 ui/dialog）size=md | **level={1}** | 🔴 自刻 button（取消 outline / 提交 gold）| 🟡 Dialog 殼對齊、footer 按鈕手刻 |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 「已付清」| 自刻 span | rounded | 🔴 `bg-morandi-green/10 text-morandi-green` | 🔴 美術色當語意（成功應走 status-success）|
| 「待確認」| 自刻 span | rounded | ✅ `bg-status-warning-bg text-status-warning` | ✅ |
| 「部分已付」| 自刻 span | rounded | ✅ `status-warning` | ✅ |
| 收據狀態 confirmed | 自刻 span | rounded-full | 🔴 `bg-morandi-green/10 text-morandi-green` | 🔴 美術色 |
| 收據狀態 pending | 自刻 span | rounded-full | ✅ `status-warning` | ✅ |
| 收據狀態 rejected | 自刻 span | rounded-full | 🔴 `bg-morandi-red/10 text-morandi-red` | 🔴 美術色（拒絕應走 status-danger）|
| 全部付清提示條 | 自刻 div | rounded-lg | 🔴 `bg-morandi-green/10 text-morandi-green` | 🔴 美術色 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 載入 | Loader2 | `h-8 w-8` | morandi-gold |
| 錯誤頁 | XCircle | `h-12 w-12` | 🔴 `text-morandi-red` |
| logo fallback | Building2 | `h-8 w-8` | morandi-gold |
| 無帳號提示 | AlertCircle | `h-4 w-4` | 🔴 `text-morandi-red` |
| 已付清 / 收據狀態 | CheckCircle2 / XCircle / Loader2 | `h-2.5~4` | 混 morandi-green / status |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 各區塊卡（header/摘要/帳號/明細/歷次）| 自刻 `bg-card border-border` | `rounded-xl` | `shadow-sm` | ✅ |
| 進度條 | 自刻 | rounded-full | 無 | morandi-gold |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入 | 自刻 Loader2 置中 | 🟡 對客頁自刻（非 ModuleLoading）|
| 載入失敗 | 自刻 XCircle 卡 | 🟡 |
| Dialog 提交成功 | 自刻 CheckCircle2（🔴 morandi-green）| 🔴 美術色 |
| 表單錯誤 | 自刻 🔴 `bg-morandi-red/10 text-morandi-red` 條 | 🔴 美術色 |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **大量手刻 button / input / select / textarea / checkbox**：付款 CTA、Dialog 兩顆按鈕、所有表單欄位都未走共用 `<Button>` / `<Input>` / `<Select>`、是原生標籤 + className。屬 ERP 內部該統一範疇。
- 🔴 **美術色當語意色（系統性）**：成功/已付清/已確認用 `morandi-green`、拒絕/錯誤用 `morandi-red`（XCircle、error 條、AlertCircle）。語意態應走 `status-success` / `status-danger`。同頁「待確認/部分已付」已正確用 `status-warning`、顯示是「改一半」狀態。
- ✅ 防連點正確：付款按鈕 `disabled={submitting}`、Dialog 提交按鈕 disabled 處理齊。
- ✅ Dialog 走共用 `<Dialog>` 殼且設 `level={1}`。
- ✅ 寫入走 `apiMutate`（PayFormDialog）。

## 備註
- 這是「ERP 內部該統一」的對客功能頁（非一次性提案）— 走 morandi design token 是對的方向、但綠/紅語意色 + 手刻表單元件兩處該修。
- 文案集中在 `types.ts` 的 `LABELS`（✅ 中央化）。
- 結論：**建議納入統一修復**：(1) morandi-green/red 語意處 → status-success/danger；(2) 手刻表單/按鈕 → 共用組件（工程量較大、可排期）。
