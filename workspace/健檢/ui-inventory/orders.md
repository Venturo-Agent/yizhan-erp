# UI 盤點：`/orders`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/orders/page.tsx` → `OrderListView.tsx` → `simple-order-table.tsx`（黃金標準操作欄來源）+ `OrderStatusBadge.tsx` + `add-order-form.tsx`
> 頁面類型：`列表`（含展開團員、快速收款/請款/開票/編輯、新增訂單對話框）

## 一句話用途
讓業務瀏覽 / 搜尋訂單（我的 / 全部），展開看團員，並對單一訂單快速收款、請款、開發票、改狀態、編輯、刪除，及新增訂單。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（標題「訂單管理」、icon ShoppingCart）
- **頁首**：ContentPageLayout 標題 + 搜尋框（搜尋團號/團名）+ 2 個 tab（我的訂單 User / 全部訂單 Users）+ `primaryAction`（新增訂單 Plus，走結構化 primaryAction，✅ 標準）
- **分頁**：`serverPagination`（PAGE_SIZE=15，固定、server-side）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增訂單」 | ContentPageLayout `primaryAction` | default（內建） | — | Plus | 金漸層 | ✅ |
| 列表行「編輯」 | `<Button variant="ghost">` + `ACTION_BUTTON_BASE` + `ACTION_BUTTON_DEFAULT_TONE` | ghost | (base h-7) | Edit2 (0.95em) | morandi-secondary | 🟡 沒走 ActionCell（黃金標準刻意手刻、有共用骨架） |
| 列表行「團員」(展開) | `<Button variant="ghost">` + ACTION_BUTTON_BASE + active 高亮 `bg-morandi-gold-light` | ghost | (base) | User (0.95em) | morandi-secondary / active gold | 🟡 同上（active 互動 ActionCell 不支援、刻意不遷移） |
| 列表行「收款」 | `<Button variant="ghost">` + ACTION_BUTTON_BASE + `text-morandi-green hover:bg-morandi-green/10` | ghost | (base) | Wallet (0.95em) | 🔴 morandi-green 美術色當「收款」語意色 | 🔴 |
| 列表行「請款」 | `<Button variant="ghost">` + `text-morandi-red hover:bg-morandi-red/10` | ghost | (base) | HandCoins (0.95em) | 🔴 morandi-red 美術色當「請款」語意色 | 🔴 |
| 列表行「開發票」 | `<Button variant="ghost">` + `text-morandi-gold hover:bg-morandi-gold/10` | ghost | (base) | FileText (0.95em) | morandi-gold（主品牌） | 🟡 gold 當「開票」語意色 |
| 列表行「刪除」 | `<Button variant="ghost">` + `text-morandi-red hover:bg-morandi-red/10` | ghost | (base) | Trash2 (0.95em) | 🔴 morandi-red 而非 status-danger | 🔴 |
| 表頭「新增」(actionsHeader，當 onAdd 傳入) | `<Button>` | default | sm `h-7 px-3` | Plus (size=12) | 金漸層 | 🟡 圖示 size=12 |
| 新增訂單對話框 footer | `AddOrderForm` 內建（取消 / 送出） | （另檔） | — | — | — | 待確認 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 頁首搜尋框 | ContentPageLayout 內建 search | text | 內建 | ✅ |
| 新增訂單表單欄位 | `AddOrderForm`（團 / 聯絡人 / 業務） | text/select | 共用 | 待確認（另檔未展開） |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 列表行狀態變更選單 | `OrderStatusBadge` 內 `<DropdownMenu>`（Badge trigger + ChevronDown） | DropdownMenuContent align=start w-32 | 🔴 見下方 Badge 區（用 Tailwind 預設色） |
| 新增訂單表單（選團 / 選業務） | AddOrderForm 內 Select/Combobox | 共用 | 待確認 |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 團員展開區內可能含選取 | OrderMembersExpandable | 待確認（另檔） |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| `<EnhancedTable<Order>>` | 共用 | 共用、`showFilters={false}` | `striped` | 自刻 emptyState（FileText 32 opacity-30 + 文字「尚無訂單」） | ✅ |
| 行展開 | EnhancedTable `expandable` → `OrderMembersExpandable`（embedded） | — | — | — | ✅ |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增訂單 | `<Dialog>` `DialogContent level={1} max-w-lg` 包 AddOrderForm | 1 | AddOrderForm 自帶 | ✅ |
| 快速收款 | `AddReceiptDialog`（finance/payments 模組） | （另檔） | — | ✅ 跨模組複用 |
| 快速請款 | `AddRequestDialog`（finance/requests 模組，dynamic ssr:false） | （另檔） | — | ✅ |
| 編輯訂單 | `OrderEditDialog` | （另檔） | — | 待確認 |
| 狀態變更確認 | `OrderStatusChangeDialog` | （另檔） | — | 待確認 |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 列表「狀態」欄（含可變更下拉） | `OrderStatusBadge` → `<Badge variant="outline">` | rounded pill h-5 | 🔴 **Tailwind 預設色**：pending_review `bg-amber-100 text-amber-700`、hk `bg-blue-100 text-blue-700`、kk `bg-green-100 text-green-700`、hl `bg-orange-100 text-orange-700`、lk `bg-teal-100 text-teal-700`；KK 選項 `text-green-700` | 🔴🔴 **嚴重違規**：整套用 Tailwind 預設色當狀態色 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面標題 | ShoppingCart | ContentPageLayout 內建 | morandi |
| tab | User / Users | 內建 | morandi |
| 新增 | Plus | `size={12}`（表頭）/ primaryAction 內建 | morandi-gold |
| 編輯 | Edit2 | `size="0.95em"` | morandi-secondary |
| 團員 | User | `size="0.95em"` | morandi-secondary |
| 收款 | Wallet | `size="0.95em"` | morandi-green |
| 請款 | HandCoins | `size="0.95em"` | morandi-red |
| 開發票 | FileText | `size="0.95em"` / 空狀態 `size={32}` | morandi-gold |
| 刪除 | Trash2 | `size="0.95em"` | morandi-red |
| 狀態下拉箭頭 | ChevronDown | `size={10}` | 繼承 |

🔴 **圖示尺寸混用**：`0.95em` / `size={10}` / `size={12}` / `size={32}` 並存。

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 頁首 tabs | ContentPageLayout 內建 | 內建 | 內建 | ✅ |
| 列表 | EnhancedTable | 共用 | 共用 | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 新增 / 刪除失敗 | `alert()` / `confirm()`（`@/lib/ui/alert-dialog`） | ✅ |
| 刪除前關聯單據檢查 | `alert('warning')` | ✅ |
| 列表空狀態 | EnhancedTable emptyState 自刻 | ✅ |
| 防連點 | 刪除走 confirm 確認；新增 dialog 關閉控制 | 🟡 列表快速動作按鈕未見明確 disabled={loading}（依賴 Dialog 內處理） |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴🔴 **`OrderStatusBadge` 整套用 Tailwind 預設色當狀態色**（`bg-amber-100/blue-100/green-100/orange-100/teal-100` + `text-*-700`）——直接違反 UI 紅線「禁用 Tailwind 預設色」。這是 orders 頁最嚴重的不統一點，且 KK「開票確認」選項也用 `text-green-700`。
- 🔴 **列表操作按鈕語意色全走美術色**：收款 `text-morandi-green`、請款/刪除 `text-morandi-red`、開票 `text-morandi-gold`，非 status-success/danger token。**注意：這是「訂單黃金標準操作欄」本身**——亦即全站列表操作欄抄的範本就用美術色，等於把美術色當語意色的做法散播到全站（tours / 各 finance 頁）。
- 🟡 **列表操作按鈕刻意手刻 `<Button variant="ghost">` + ACTION_BUTTON_BASE 而非 ActionCell**（註解說明：展開 active 高亮、多語意色，ActionCell 不支援，故不遷移）。這是「黃金標準」的定位，但與 ActionCell 體系是兩套並行。
- 🟡 **刪除按鈕用 morandi-red**，而 ActionCell 的 danger variant 已走 `text-status-danger`——同一個「刪除」語意，黃金標準頁與 ActionCell 兩種 token 不一致。
- 🔴 **圖示尺寸寫法混用**：`0.95em` / `size={10}` / `size={12}` / `size={32}`。

## 備註
- `simple-order-table.tsx` 是全站列表操作欄的「黃金標準來源」（`ACTION_BUTTON_BASE` 常數註解明指此檔）。因此它本身用 morandi-green/red/gold 美術色當語意色的做法，被當成範本擴散——若要全站收斂「美術色 vs status token」，**這裡是源頭、要先拍板改不改黃金標準**。
- OrderListView 把訂單表 + 收款/請款/編輯 3 個 Dialog 打包，/orders 主頁與 /tours/[code]?tab=orders 共用。
- 未逐項展開：AddOrderForm、OrderEditDialog、OrderStatusChangeDialog、OrderMembersExpandable — 標「待確認」。
