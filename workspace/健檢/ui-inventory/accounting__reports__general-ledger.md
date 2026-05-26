# UI 盤點：`/accounting/reports/general-ledger`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/accounting/reports/general-ledger/page.tsx`（+ `../_components/QuickDateButtons.tsx`）
> 頁面類型：`報表`（總帳明細帳、單科目 + 日期區間）

## 一句話用途
選科目 + 日期區間查該科目的明細帳（每筆分錄的日期/傳票號/摘要/借方/貸方/累計餘額）、底部顯示總計。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title=總帳）
- **頁首**：標題 `t('generalLedger')`、無麵包屑、無頁首動作
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
| 無（僅 Select + DatePicker） | - | - | - | - |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 科目選擇 | `<Select>` | 標準 | ✅ |
| 開始日期 | `<DatePicker>` | 標準 | ✅ |
| 結束日期 | `<DatePicker>` | 標準 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | - | - |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 自刻 `<table>`（含累計餘額 + 總計行） | px-4 py-3 | `bg-morandi-container` 手刻 th | hover:bg-morandi-container | 「請選擇科目和日期範圍」 | 🟡 手刻 table（會計報表性質、可接受） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | - | - | - | - |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 無 | - | - | - | - |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 查詢 | `Search` | `size={16}` | (button 內) |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 查詢條件卡 | `<Card>` p-4 | Card 預設 | - | ✅ |
| 科目資訊卡 | `<Card>` p-4 | Card 預設 | - | ✅ |
| 總帳明細卡 | `<Card>` p-0 overflow-hidden（包 table） | Card 預設 | - | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 未選科目/日期警告 | `toast.warning`（t('pleaseSelectAccountAndDate')） | ✅ |
| 載入失敗 | `logger.error`（無 toast） | 🟡 失敗只進 log |
| 空狀態 | table 內「請選擇科目和日期範圍」/「載入中...」 | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **手刻 table + bg-morandi-container 表頭**：與 trial-balance 同套寫法（th 用 bg-morandi-container border-b），但與 balance-sheet / income-statement 的 flex 排版不一致 → 同模組報表兩種排版法。
- **載入失敗只進 logger、無 toast**：loadLedger catch 只 `logger.error`、用戶無感（其他報表頁有 toast.error）。
- **無美術色濫用**（本頁相對乾淨、無 morandi-green/red 語意誤用）。

## 備註
- 累計餘額在 client 端用 `lines.slice(0, index+1).reduce` 算（O(n²)、資料多時效能隱憂、非 UI 順帶記）。
- 資料直接 `supabase.from('journal_lines')` join voucher、未走 report hook（紅線 F 順帶記）。
- QuickDateButtons 用區間模式（非 onlyEnd）✅。
