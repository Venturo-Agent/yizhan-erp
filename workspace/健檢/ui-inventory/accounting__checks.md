# UI 盤點：`/accounting/checks`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/accounting/checks/page.tsx`（+ `components/CreateCheckDialog.tsx`）
> 頁面類型：`列表`（支票 / 票據管理、頂部含統計卡）

## 一句話用途
管理支票與票據、列出未兌現/已兌現/作廢/退票、頂部顯示「未兌現張數 / 金額 / 逾期張數」統計、可標記兌現或作廢、新增票據。

## Layout 骨架
- **頁面框架**：自刻 `div`（`h-full flex flex-col`）外殼 + 內嵌 `ListPageLayout`
- **頁首**：頂部自刻統計卡片區（3 張）+ ListPageLayout 標題 `t('checkManagement')` + primaryAction（新增票據）
- **分頁**：無筆數分頁

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增票據」 | `ListPageLayout.primaryAction` | (主CTA) | - | Plus | 金漸層 | ✅ |
| 列表行「標記已兌現」 | `<Button>` variant=ghost + ACTION_BUTTON_BASE | ghost | sm | CheckCircle | text-status-success | 🔴 套骨架但沒走 ActionCell |
| 列表行「作廢」 | `<Button>` variant=ghost + ACTION_BUTTON_BASE | ghost | sm | XCircle | text-status-danger | 🔴 套骨架但沒走 ActionCell |

### ⌨️ 輸入框 Input / Textarea（Create Dialog 內）
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 票據號碼 | `<Input>` | text | 共用組件 | ✅ |
| 金額 | `<Input>` | number step=0.01 | 共用組件 | ✅ |
| 受款人 | `<Input>` | text | 共用組件 | ✅ |
| 備註 | `<Textarea>` rows=3 | textarea | 共用組件 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown（Dialog 內）
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 開票日期 | `<DatePicker>` | 標準 | ✅ |
| 到期日 | `<DatePicker>` | 標準 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | - | - |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| `EnhancedTable`（透過 ListPageLayout） | 標準 | 標準 | 由組件控 | ListPageLayout 內建 | ✅ |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增票據/支票 | `FormDialog` maxWidth=lg | (FormDialog 預設) | 內建 submitLabel | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 票據狀態（未兌現/已兌現/作廢/退票） | `<Badge>` variant=secondary/default/outline/destructive | 標準 | statusConfig.color（text-morandi-gold/green/secondary/red、實際渲染只用 variant 不用 color） | 🟡 statusConfig 帶 color 欄位但 render 只用 variant、color 未實際套用 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 新增票據 | `Plus` | (primaryAction icon) | - |
| 標記已兌現 | `CheckCircle` | `size="0.95em"` | text-status-success |
| 作廢 | `XCircle` | `size="0.95em"` | text-status-danger |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 未兌現支票統計 | 手刻 `<div>` bg-status-warning-bg p-4 rounded-lg | rounded-lg | - | 🟡 手刻 div、非 Card 組件 |
| 未兌現金額統計 | 手刻 `<div>` bg-status-info/10 rounded-lg | rounded-lg | - | 🟡 手刻 div |
| 逾期支票統計 | 手刻 `<div>` bg-morandi-red/10 rounded-lg | rounded-lg | - | 🔴 手刻 div + morandi-red 當「逾期=危險」語意色 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 兌現/作廢確認 | `confirm()`（type=warning） | ✅ |
| 操作失敗 | `toast.error`（COMMON_MESSAGES.OPERATION_FAILED + 一處硬編字串「操作失敗，請稍後再試」） | 🟡 一處硬編字串、一處走 COMMON_MESSAGES、不統一 |
| 載入中 | ListPageLayout loading prop | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **行內操作按鈕沒走 ActionCell**：兌現 / 作廢用 `<Button variant=ghost>` 套 ACTION_BUTTON_BASE、視覺對齊但組件不對齊（黃金標準 ActionCell）。
- **統計卡手刻 div、非 Card 組件**：3 張統計卡用裸 `<div>` + bg-xxx rounded-lg、未用 `<Card>`。
- **美術色當語意色**：逾期統計卡用 `bg-morandi-red/10 text-morandi-red`、到期日逾期用 `text-morandi-red`、應改 status-danger。
- **statusConfig 帶 color 但未用**：定義了 text-morandi-gold/green 等 color 欄位、但 Badge render 只吃 variant、color 是 dead 屬性。
- **錯誤訊息源不統一**：handleClearCheck 用 `COMMON_MESSAGES.OPERATION_FAILED`、handleVoidCheck 硬編「操作失敗，請稍後再試」。
- **確認變數命名隨意**：`confirmed` vs `confirmed2`。

## 備註
- 統計卡（pending/pendingAmount/overdue）在 client 端 filter 計算、未走報表 hook。
- 列表直接 `supabase.from('checks')` 載入、但新增走 `createCheck` entity hook（自動失效快取）；兌現/作廢用裸 `supabase.update`（紅線 F、非 UI 順帶記）。
