# UI 盤點：`/accounting/reports/balance-sheet`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/accounting/reports/balance-sheet/page.tsx`（+ `../_components/QuickDateButtons.tsx`）
> 頁面類型：`報表`（資產負債表、左右兩欄）

## 一句話用途
選截止日查資產負債表：左欄資產、右欄負債+權益（含本期損益）、底部驗會計等式（資產 = 負債 + 權益）平衡。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title=資產負債表）
- **頁首**：標題 `t('balanceSheetTitle')`、無麵包屑、無頁首動作
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 查詢條件「查詢」 | `<Button>` w-full | default（金漸層） | default | Search | 金漸層 | ✅（disabled={isLoading} ✅） |
| 快速日期（至今日/至本月底/...） | `QuickDateButtons` → `<Button>` | outline | sm | - | outline 金邊 | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 無（僅 DatePicker） | - | - | - | - |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 截止日期 | `<DatePicker>` | 標準 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | - | - |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 自刻 `flex justify-between` 明細列（非 table） | py-1 | Card 標題分組 | 無 | 「無資產記錄」等 | 🟡 報表用 flex 排版、非 EnhancedTable（會計報表性質、可接受） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | - | - | - | - |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 無 Badge、用色彩文字標示分類/平衡 | 純文字 | - | 見下 | - |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 查詢 | `Search` | `size={16}` | (button 內) |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 查詢條件卡 | `<Card>` p-4 | Card 預設 | - | ✅ |
| 資產卡 / 負債權益卡 | `<Card>` p-6 ×2 | Card 預設 | - | ✅ |
| 平衡檢查卡 | `<Card>` bg-morandi-green/10 或 bg-morandi-red/10 | Card 預設 | - | 🔴 平衡=綠底/不平衡=紅底用 morandi-green/red |
| 空狀態卡 | `<Card>` p-8 | Card 預設 | - | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 未選日期警告 | `toast.warning`（COMMON_MESSAGES.PLEASE_SELECT_DATE） | ✅ |
| 載入失敗 | `toast.error`（COMMON_MESSAGES.LOAD_FAILED） | ✅ |
| 空狀態 | Card「請選擇日期並查詢」 | ✅ |
| 查詢中 | 按鈕文字「查詢中」（t('searching')） | 🟡 文字載入、無 Skeleton |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **美術色當語意色（大量）**：
  - 資產標題/總計 `text-status-info`（✅ info 語意）、但「流動資產」小標也用 status-info。
  - 負債標題 `text-morandi-red`、權益標題 `text-morandi-green`、負債權益總計 `text-morandi-secondary` → morandi-red/green 當分類色。
  - 本期損益正負用 morandi-green/red。
  - 平衡檢查卡 bg/text 用 morandi-green/red 當「平衡=成功 / 不平衡=危險」語意色（應改 status-success/danger）。
- **emoji 當狀態**：「✅ 平衡」「⚠️ 不平衡」寫在文字內。
- **明細用 flex 排版非 table**：報表性質可接受、但與 general-ledger / trial-balance 的 table 排版不一致（同模組報表兩種排版法）。

## 備註
- 資料直接 `supabase.from('chart_of_accounts' / 'journal_lines')` 多次查、未走 report hook（`createReportHook` SSOT、紅線 F 順帶記）。
- QuickDateButtons 用 onlyEnd 模式（時點快照）✅。
