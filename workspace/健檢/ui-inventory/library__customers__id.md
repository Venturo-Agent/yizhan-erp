# UI 盤點：`/library/customers/[id]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/library/customers/[id]/page.tsx`
> 主要 _components：`CustomerDialog`（共用編輯 dialog）
> 頁面類型：`詳情`（4 tab + 內嵌列表）

## 一句話用途
單一顧客詳情頁、4 個分頁：基本資料（show + 編輯）/ 訂單記錄 / 交易記錄 / 帳單記錄。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title 動態 `名字 — 編號`、icon `User`、tabs + headerActions）
- **頁首**：標題動態、無麵包屑、頁首動作有「返回列表」(ghost) +「編輯」(outline)
- **分頁**：頁面層用 `ContentPageLayout` tabs（icon tabs）+ 內容層用 shadcn `Tabs/TabsContent`（雙層 Tabs、同步 activeTab）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「返回列表」 | `<Button>` | `ghost` | sm | `ArrowLeft` (size=14) | accent | 🟡 ghost、非主流 header-outline |
| 頁首「編輯」 | `<Button>` | `outline` | sm | `Edit` 🔴 (size=14) | morandi token | 🟡 用 outline、圖示 `Edit` 非 `Edit2` |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 基本資料展示（read-only Field） | 自刻 `Field`（`<div>`） | text 唯讀 | morandi token | ✅（純展示） |
| 編輯欄位 | 在 `CustomerDialog`（見 customers 頁） | — | — | 🟡 共用 dialog |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 無 | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| `EnhancedTable`（訂單/交易/帳單三 tab） | 內建 | 內建 | 內建 | 自刻 Card 空狀態 | ✅（表格）/ 🟡（空狀態自刻） |

> 訂單欄：訂單號/團號/金額(CurrencyCell)/付款狀態(StatusBadge)/建立日(DateCell)
> 交易欄：收款單號/收款日/實收(CurrencyCell income)/後五碼/狀態
> 帳單欄：開立日/到期日/應收/已收/狀態

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 編輯顧客 | `CustomerDialog`（mode=edit、ManagedDialog） | showFooter=false 自刻 | soft-gold | 🟡 同 customers 頁、footer 自刻 |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 訂單/交易/帳單 狀態 | 自刻 `StatusBadge`（本檔內定義、非共用 `@/components/ui/status-badge`） | 純文字 `<span>` | `STATUS_COLOR` map → `text-morandi-income`/`text-morandi-gold`/`text-morandi-red`/`text-morandi-secondary` 🔴 | 🔴 美術色當語意色 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁首返回 | `ArrowLeft` | `size={14}` | — |
| 頁首編輯 | `Edit` 🔴 | `size={14}` | — |
| Tab 基本資料 | `User` | tab icon | — |
| Tab 訂單記錄 | `ShoppingBag` | tab icon | — |
| Tab 交易記錄 | `Wallet` | tab icon | — |
| Tab 帳單記錄 | `FileText` | tab icon | — |
| 頁面 icon / 找不到 | `User` | ContentPageLayout | — |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 基本資料卡 | `<Card className="p-6">` | 內建 | 內建 | ✅ |
| 各 tab 空狀態卡 | `<Card className="p-8 text-center">` | 內建 | 內建 | ✅ |
| 雙層 Tabs | `Tabs`/`TabsContent`（shadcn）+ ContentPageLayout tabs | — | — | 🟡 雙層 tabs 同步、略冗 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 頁面載入 | `Spinner size="lg"` | ✅ |
| tab 切換載入 | 自刻 `LoadingBlock`（內含 Spinner） | ✅ |
| 找不到顧客 | 自刻 `<div>` 文字 | 🟡 自刻空狀態 |
| 各 tab 無資料 | 自刻 `<Card>` 文字 | 🟡 自刻空狀態 |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **本檔自刻 `StatusBadge` + `STATUS_COLOR` map 全用美術色**（`text-morandi-income`/`text-morandi-gold`/`text-morandi-red`）當付款/收款/帳單狀態色 → 應走 `status-success`/`status-warning`/`status-danger` token。且專案已有共用 `@/components/ui/status-badge`（attractions dialog 有用）、這裡卻自己再刻一份 → SSOT 分岔。
- 🔴 **頁首「編輯」鈕圖示用 `Edit`**、全站主流是 `Edit2`。
- 🟡 頁首按鈕用 `ghost` + `outline`、跟其他 library 頁的 `header-outline` 不一致（返回/編輯 vs 匯入/新增 的視覺軌不同）。
- 🟡 雙層 Tabs（ContentPageLayout tabs + shadcn Tabs）並存、需手動同步 activeTab、略冗餘。
- 🟡 多處空狀態 / 找不到 自刻 `<div>`/`<Card>` 文字、無統一 EmptyState 組件。

## 備註
- 三個 tab 的資料用 `useEffect` + 直接 `supabase.from(...)` / `dynamicFrom('invoices')` 拉、setState 存 local（非 entity hook）→ 屬紅線 F 範疇（讀取 SSOT）、非 UI 議題、留記。
- 基本資料展示用自刻 `Field` 元件（label + value 兩行）、純展示乾淨。
- 編輯走共用 `CustomerDialog`（mode=edit）、UI 細節見 `library__customers.md`。
