# UI 盤點：`/tours/[code]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/tours/[code]/page.tsx` → `TourTabs.tsx`（TourTabContent）+ 各分頁組件（tour-overview / tour-orders / tour-receipts / tour-costs / tour-quote-tab / tour-itinerary-tab / TourClosingSections / OrderMembersExpandable）
> 頁面類型：`詳情`（多 tab、含財務 / 訂單 / 團員 / 行程 / 報價 / 總覽 / 結案）

## 一句話用途
單一旅遊團的中央工作台：查看與操作該團的訂單、團員、行程、報價、財務（收款 / 請款）、總覽與結案。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（標題 = tour.name、icon MapPin、breadcrumb 旅遊團 → 團號名稱）
- **頁首**：ContentPageLayout 內建標題 + breadcrumb + tabs（依 workspace feature + capability 動態過濾）
- **Tabs**：6 個主 tab（訂單 / 團員 / 行程 / 展示行程 / 報價 / 總覽），「結案」併在總覽內。預設 tab = orders。tab 切換同步 URL `?tab=`。動態 import 各 tab（dynamic + TabLoading Spinner）
- **分頁**：各 tab 內表格自行處理（訂單走 OrderListView、團員走 OrderMembersExpandable）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 找不到團「返回列表」 | `<Button>` | default | default | 無 | 金漸層 | ✅ |
| 總覽分頁 — 收款表「單號」可點 | `<Button variant="link">` className `text-morandi-gold hover:text-morandi-gold-hover` | link | h-auto p-0 | 無 | morandi-gold | 🟡 link 文字按鈕、可接受 |
| 總覽 — 請款表(tour-costs)「新增支出」 | `<Button>` | soft-gold | sm | Plus (size=14) | morandi-gold | 🟡 圖示 size=14 |
| 新增支出對話框 footer | `FormDialog` 內建（submitLabel / cancelLabel） | FormDialog default | — | 無 | 走 FormDialog 預設 | ✅ |
| 訂單分頁按鈕 | 全走 `OrderListView`（見 orders.md，含 ActionCell + 訂單黃金標準操作欄） | — | — | — | — | ✅（黃金標準來源頁） |
| 團員分頁按鈕 | `OrderMembersExpandable`（toolbar + 行操作，另檔） | — | — | — | — | 待確認 |
| 報價 / 行程 / 結案分頁按鈕 | 各分頁組件自帶 | — | — | — | — | 待確認 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 新增支出 — 金額 | `<Input type="number">` | number | 共用 Input | ✅ |
| 新增支出 — 備註 | `<Input>` | text | 共用 Input | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 新增支出 — 類別 | `<Select>`（shadcn SelectTrigger/Content/Item） | 共用 | ✅ |
| 新增支出 — 供應商 | `<Select>` | 共用 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 團員分頁可能含選取 | OrderMembersExpandable | 待確認 |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 收款總覽（tour-receipts） | 🔴 手刻 `<table>` + colgroup（非 EnhancedTable） | 手刻 thead，header 列 `bg-morandi-green/10` 綠底 | 無，hover `bg-morandi-bg/50` | 自刻（TrendingUp 24 + 文字「尚無收款紀錄」） | 🔴 手刻 table + 綠色 header（morandi-green 美術色當「收款」語意色） |
| 請款總覽（PaymentRequestOverviewTable） | 手刻 table（另檔，與收款表 colgroup 對齊） | 手刻 | — | — | 🔴 同上類型（手刻 table） |
| 訂單分頁 | `OrderListView` → `simple-order-table`（黃金標準） | 共用 | — | — | ✅ |
| 團員分頁 | `OrderMembersExpandable`（可展開行） | — | — | — | 待確認 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增支出 | `FormDialog` | 2 | FormDialog 內建（submit/cancel label） | ✅ |
| 收款明細編輯 | `AddReceiptDialog`（finance/payments 模組複用） | （另檔） | — | ✅ 跨模組複用 |
| 訂單分頁各對話框 | OrderListView 內建（見 orders.md） | — | — | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 總覽標題列 — 團狀態 | `<StatusBadge tone=... label=...>`（legacy tone API，本檔自刻 getStatusTone map：提案=pending / 進行中=success / 待結案=warning / 結案=neutral） | soft pill | tone map | 🟡 自刻 tone map（不走 status-tone-map.ts SSOT）；success/danger tone 內部仍 morandi-green/red |
| 收款表 — 狀態欄 | `<StatusBadge type="receipt" status=...>` | soft pill | tone map | ✅ 走 SSOT type API |
| 請款表 — 狀態欄 | `<StatusBadge type="payment_request" status=...>` | soft pill | tone map | ✅ |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面標題 | MapPin | ContentPageLayout 內建 | morandi |
| 總覽標題列資訊 | MapPin / Calendar / Users | `size={14}` | morandi-secondary |
| 總覽財務卡 | Wallet / HandCoins / DollarSign / FileText / FileSignature | `size={16}` | 🔴 morandi-green（收入/利潤正）/ morandi-red（支出/利潤負）/ morandi-gold（訂單） |
| 收款表標題 | TrendingUp | `w-4 h-4` / 空狀態 `size={24}` | morandi-green |
| 新增支出 | Plus | `size={14}` | morandi-gold |

🔴 **圖示尺寸寫法混用**：`size={14}` / `size={16}` / `size={24}` / `w-4 h-4` 並存。

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 詳情 tabs | ContentPageLayout 內建 tabs | 內建 | 內建 | ✅ |
| 總覽卡片容器 | 自刻 div `border border-border rounded-lg bg-card` | rounded-lg | 無 | ✅ |
| 總覽標題列 | 自刻 div `bg-morandi-gold-header` | — | — | ✅（品牌 header 底） |
| 收款表容器 | 自刻 div `border rounded-lg bg-card`，header `bg-morandi-green/10` | rounded-lg | 無 | 🔴 綠色 header 底 |
| TourTabs（舊版 _TourTabs，未使用） | 自刻 tab 列 `<button>` + `border-primary text-primary` | — | — | 🟡 dead-ish（page.tsx 走 ContentPageLayout、非此元件） |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 各 tab 載入 | `dynamic` + `TabLoading`（Spinner size=lg text-muted-foreground） | ✅ |
| 頁面載入 | `<ModuleLoading>` | ✅ |
| 操作成功 / 失敗 | `toast`（sonner） | ✅ |
| 收款 / 請款空狀態 | 手刻（TrendingUp icon + 文字） | 🟡 自刻空狀態（非共用 EmptyState） |
| 防連點 | 新增支出 `isAddSubmitting` + FormDialog `loading` | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **收款 / 請款總覽用手刻 `<table>` + colgroup**（tour-receipts.tsx、PaymentRequestOverviewTable.tsx），非 EnhancedTable。收款表 header 用 `bg-morandi-green/10` + `text-morandi-green` 綠色——把美術色 morandi-green 當「收款」語意色。
- 🔴 **財務數字色直接用 morandi-green（收入/利潤正）/ morandi-red（支出/利潤負）**遍布 tour-overview / tour-costs（如 `text-morandi-green`、`text-morandi-red`、收款待核 morandi-red），非 status-success/danger token。
- 🟡 **tour-overview 自刻 getStatusTone map**（提案→pending、進行中→success…），不走全站 `status-tone-map.ts` SSOT；其他表用 `StatusBadge type=` SSOT，同頁兩種寫法並存。
- 🟡 **舊版 `_TourTabs` 元件保留**（手刻 `<button>` tab 列、`border-primary text-primary`），但實際頁面走 ContentPageLayout，疑似未使用 dead-ish 代碼。
- 🔴 **圖示尺寸寫法混用**：`size={14}/{16}/{24}` 與 `w-4 h-4` 並存。

## 備註
- 詳情頁高度複用其他模組組件：訂單分頁 = orders 模組 `OrderListView`（黃金標準）、團員分頁 = orders 模組 `OrderMembersExpandable`、收款編輯 = finance/payments 模組 `AddReceiptDialog`。跨模組複用降低重複，但財務表（收款/請款總覽）是 tours 自刻 table、與 EnhancedTable 體系分岔。
- tab 可見性走 `useVisibleModuleTabs`（feature gate + capability），行程/展示行程依 tour_service_type 條件隱藏，結案區塊依 `tours.closing` feature 條件渲染。
- 未逐項展開：OrderMembersExpandable（團員 toolbar + 行操作 + PNR 配對對話框）、tour-quote-tab、tour-itinerary-tab、TourClosingSections — 標「待確認」，需要時深掃。
