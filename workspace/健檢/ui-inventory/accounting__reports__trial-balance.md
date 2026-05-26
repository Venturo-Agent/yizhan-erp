# UI 盤點：`/accounting/reports/trial-balance`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/accounting/reports/trial-balance/page.tsx`（+ `../_components/QuickDateButtons.tsx`）
> 頁面類型：`報表`（試算表、按類型分組列所有科目借貸總額 + 餘額）

## 一句話用途
選截止日查試算表：依科目類型分組（資產/負債/權益/收入/費用/成本）列出每個科目的借方總額、貸方總額、餘額、底部驗借貸是否平衡。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title=試算表）
- **頁首**：標題 `t('trialBalanceTitle')`、無麵包屑、無頁首動作
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 查詢條件「查詢」 | `<Button>` w-full | default（金漸層） | default | Search | 金漸層 | ✅（disabled={isLoading} ✅） |
| 快速日期（至今日/至本月底/...） | `QuickDateButtons` onlyEnd → `<Button>` | outline | sm | - | outline 金邊 | ✅ |

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
| 自刻 `<table>`（類型分組標題列 + 明細 + 總計 + 平衡警告列） | px-4 py-3 | `bg-morandi-container border-b` 手刻 th | hover:bg-morandi-container | 「請選擇日期並查詢」/「載入中」 | 🟡 手刻 table（會計報表性質、可接受） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | - | - | - | - |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 科目類型（資產/負債…） | `<Badge>` variant=outline text-xs | outline | 無語意色（純 outline） | ✅ |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 查詢 | `Search` | `size={16}` | (button 內) |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 查詢條件卡 | `<Card>` p-4 | Card 預設 | - | ✅ |
| 試算表卡 | `<Card>` p-0 overflow-hidden（包 table） | Card 預設 | - | ✅ |
| 說明卡 | `<Card>` bg-status-info/10 border-status-info/30 | Card 預設 | - | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 未選日期警告 | `toast.warning`（COMMON_MESSAGES.PLEASE_SELECT_DATE） | ✅ |
| 載入失敗 | `toast.error`（COMMON_MESSAGES.LOAD_FAILED） | ✅ |
| 空狀態 | table 內「請選擇日期並查詢」/ COMMON_MESSAGES.LOADING | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **美術色當語意色**：餘額正負用 `text-morandi-green`（借方餘額）/ `text-morandi-red`（貸方餘額）、平衡警告列 `bg-morandi-red/10 text-morandi-red`（不平衡）→ 應改 status token。
- **emoji 當狀態**：說明卡「帳務平衡 ✅」、警告列「⚠️ 警告：借貸不平衡」用 emoji。
- **React key warning 隱憂**：`Object.entries(groupedBalances).map` 回傳 `<>...</>` Fragment 無 key（type 分組）、可能 console warning（非 UI 樣式、順帶記）。
- **手刻 table**：與 general-ledger 同套（bg-morandi-container th）、與 balance-sheet/income-statement 的 flex 排版分岔。

## 備註
- 科目類型 Badge 走純 outline、無語意色濫用（這點比 accounts 頁的 typeConfig 乾淨）。
- 資料直接 `supabase.from('chart_of_accounts' / 'journal_lines')` 查、未走 report hook（紅線 F 順帶記）。
- QuickDateButtons 用 onlyEnd 模式（時點快照）✅。
