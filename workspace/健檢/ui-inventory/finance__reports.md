# UI 盤點：`/finance/reports`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/finance/reports/page.tsx`（含 `_components/`：DateRangeSelector、OverviewTab、OverviewStatCards、OverviewSupplierTable、DisbursementTab、IncomeTab、TourPnlTab、PayablesTab、BankBalancesTab、ReportStatCard、ReportSectionTitle）
> 頁面類型：`儀表板`（多分頁報表）

## 一句話用途
財務報表中心：6 個分頁（收支總覽 / 請款報表 / 收款報表 / 損益表 / 應付帳款 / 銀行餘額），含日期區間選擇器與「按筆/按日/按團/按供應商」顆粒度切換。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（icon=BarChart3，tabs 走 ContentPageLayout 的 tabs prop）
- **頁首**：標題 `t('financeReports')`、headerChildren 放 DateRangeSelector + 顆粒度切換器（toolbar）
- **分頁**：頁籤切換（ContentPageLayout tabs + shadcn Tabs 雙層），各 tab 內部表格不分頁（slice(0,100)）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 顆粒度切換（按筆/日/團/供應商） | 手刻 `<button>`（page.tsx L118） | - | px-3 py-1 | List/CalendarDays/Map/Truck | active: bg-card text-morandi-primary | 🔴 手刻 button segmented control（非 Button 組件） |
| DateRangeSelector 月/季/年/自訂 | 手刻 `<button>`（L168） | - | px-3 py-1 | 無 | active: bg-card | 🔴 手刻 button segmented control |
| DateRangeSelector 上/下一期 | `<Button>` | ghost | iconSm | ChevronLeft/Right | morandi-secondary | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 自訂區間起訖日 | `DatePicker`（DateRangeSelector） | date | buttonClassName h-8 | ✅ |

### 🔽 下拉 / 選擇
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （無傳統 Select；以 segmented button 取代） | - | - | - |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| OverviewTab 明細/分組 | `EnhancedTable` | 預設 | 預設 | 「此區間無交易記錄」 | ✅ |
| OverviewSupplierTable | 手刻 `<table>`（自刻 td/th） | py-2.5 px-4 | border-b | - | 🟡 手刻 table 而非 EnhancedTable |
| DisbursementTab / IncomeTab | EnhancedTable + StatusCell | 預設 | - | - | ✅ |
| TourPnlTab | 手刻 table | - | - | - | 🟡 手刻 table |
| PayablesTab / BankBalancesTab | （aging 表 + StatCard） | - | - | - | ✅/待確認 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| （無） | - | - | - | - |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| OverviewTab 類型（收入/支出） | `<Badge variant="outline">` + 手寫 className | badge | 🔴 bg-morandi-green/10 text-morandi-green / bg-morandi-red/10 text-morandi-red | 🔴 收入/支出用美術綠紅當語意色 |
| DisbursementTab/IncomeTab 狀態 | `StatusCell type="payment"` | badge | status-tone-map | ✅ |
| TourPnlTab 盈虧 | `<Badge variant="outline">` + text-morandi-green/morandi-muted | badge | 🔴 morandi-green 當「賺」語意色 | 🔴 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| tab 圖示 | BarChart3/FileDown/TrendingUp/PieChart/Building/Banknote | （tabs 內建） | - |
| 顆粒度 | List/CalendarDays/Map/Truck | `className="h-3.5 w-3.5"` | inherit |
| 日期導航 | ChevronLeft/ChevronRight | `className="h-5 w-5"` | inherit |
| 明細區標題 | FileText | `className="h-3.5 w-3.5"` | text-morandi-primary |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 報表統計卡（5 分頁共用） | `ReportStatCard`（Card + CardContent） | 預設 | hover:border-morandi-gold/40 | ✅（2026-05-23 已收斂成單一份） |
| 收支總覽統計卡 | `OverviewStatCards` | - | - | 🟡 內部用 amountColor=text-morandi-green/red 美術色 |
| 分頁切換 | ContentPageLayout tabs + shadcn `Tabs`/`TabsContent` | - | - | ✅ |

### 🔔 回饋 / 空狀態 / 載入
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入中 | 手刻「載入中...」文字 | 🟡 非統一 Skeleton/Loading 組件 |
| 空狀態 | 手刻「此區間無交易記錄」文字 | 🟡 |
| 錯誤（PayablesTab/ReceivablesTab/BankBalancesTab） | 手刻 `<div className="text-morandi-red">` | 🟡 |
| 錯誤（TourPnlTab L200） | 手刻 div | 🔴 `text-red-600`（Tailwind 預設色！） |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **`TourPnlTab.tsx:200` 用 `text-red-600`（Tailwind 預設色）**顯示錯誤訊息 — 直接違反 UI 紅線（禁用 Tailwind 預設色），應走 `text-status-danger`。
- 🔴 **收入/支出/盈虧全面用美術色 morandi-green / morandi-red 當語意色**（OverviewTab Badge + 金額、OverviewStatCards、OverviewSupplierTable、TourPnlTab、PayablesTab/ReceivablesTab/BankBalancesTab 的錯誤文字也用 morandi-red）— 語意該走 status-success/danger token。
- 🔴 **兩組手刻 `<button>` segmented control**（頁面顆粒度切換 + DateRangeSelector 月/季/年/自訂），非 Button 組件、樣式各自手寫。
- 🟡 多處手刻 `<table>`（OverviewSupplierTable、TourPnlTab）而非 EnhancedTable。
- 🟡 載入/空狀態/錯誤都用手刻文字 div，非統一 Skeleton/EmptyState/Error 組件。

## 備註
- 應收帳款 tab（ReceivablesTab）已被 William 2026-05-23 註解隱藏（orders.total_amount 未填、報表無意義），檔仍在但未掛載。
- ReportStatCard 是 2026-05-23 收斂後的好範例（5 份重複 StatCard 收成一份）；但 OverviewStatCards 另有一套、未完全統一。
