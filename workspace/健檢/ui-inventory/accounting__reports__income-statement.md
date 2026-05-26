# UI 盤點：`/accounting/reports/income-statement`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/accounting/reports/income-statement/page.tsx`（+ `../_components/QuickDateButtons.tsx`）
> 頁面類型：`報表`（損益表、收入-成本=毛利、毛利-費用=淨利）

## 一句話用途
選日期區間查損益表：列收入 / 營業成本 / 毛利 / 營業費用 / 本期淨利、底部給毛利率 / 淨利率公式說明。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title=損益表）
- **頁首**：標題 `t('incomeStatementTitle')`、無麵包屑、無頁首動作
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 查詢條件「查詢」 | `<Button>` w-full | default（金漸層） | default | Search | 金漸層 | ✅（disabled={isLoading} ✅） |
| 快速日期（今日/本月/...） | `QuickDateButtons` → `<Button>` | outline | sm | - | outline 金邊 | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 無（僅 DatePicker） | - | - | - | - |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 開始日期 | `<DatePicker>` | 標準 | ✅ |
| 結束日期 | `<DatePicker>` | 標準 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | - | - |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 自刻 `flex justify-between` 明細列（非 table） | py-1 | 文字小標分組 | 無 | 「無收入記錄」等 | 🟡 報表用 flex 排版、非 EnhancedTable |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | - | - | - | - |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 無 Badge | - | - | - | - |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 查詢 | `Search` | `size={16}` | (button 內) |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 查詢條件卡 | `<Card>` p-4 | Card 預設 | - | ✅ |
| 損益表主體卡 | `<Card>` p-6 | Card 預設 | - | ✅ |
| 公式說明塊 | `<div>` bg-status-info/10 rounded | rounded | - | ✅ |
| 空狀態卡 | `<Card>` p-8 | Card 預設 | - | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 未選日期區間警告 | `toast.warning`（COMMON_MESSAGES.PLEASE_SELECT_DATE_RANGE） | ✅ |
| 載入失敗 | `toast.error`（COMMON_MESSAGES.LOAD_FAILED） | ✅ |
| 空狀態 | Card「請選擇日期範圍並查詢」 | ✅ |
| 查詢中 | 按鈕文字「查詢中」 | 🟡 文字載入 |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **美術色當分類/語意色（大量）**：
  - 收入小標 `text-morandi-green`、成本小標 `text-status-warning`、費用小標 `text-morandi-secondary` → morandi-green 當分類色。
  - 成本合計 / 費用合計金額 `text-morandi-red`。
  - 毛利 / 淨利正負用 `text-morandi-green / text-morandi-red` 當語意色（應改 status-success/danger）。
- **明細用 flex 排版非 table**：與 general-ledger / trial-balance 的 table 排版不一致（同模組報表兩種排版）。
- **金額負數用括號 + 紅字**：「(${...})」格式、會計慣例、可接受。

## 備註
- 資料直接 `supabase.from('chart_of_accounts' / 'journal_lines')` 查、未走 report hook（紅線 F 順帶記）。
- 與 balance-sheet 排版風格一致（flex 明細 + Card）、與 ledger/trial-balance（table）分岔。
- QuickDateButtons 用區間模式 ✅。
