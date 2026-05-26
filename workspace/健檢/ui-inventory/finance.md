# UI 盤點：`/finance`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/finance/page.tsx`
> 頁面類型：`儀表板`

## 一句話用途
財務管理中心首頁：4 張收支總覽統計卡 + 2 張功能模組導航卡 + 交易紀錄列表（含手動分頁）。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（`contentClassName="flex-1 overflow-auto"`）
- **頁首**：標題 `t('financeManagementCenter')`、無麵包屑、無頁首動作按鈕
- **分頁**：有，手刻分頁列（兩顆 `<Button>` 上一頁/下一頁 + 文字摘要），非 serverPagination 制式組件

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 分頁「上一頁」 | `<Button>` | default（金漸層） | default | 無 | btn-primary | 🟡 分頁鈕用主 CTA 金漸層、語意偏重（一般分頁該用次要樣式） |
| 分頁「下一頁」 | `<Button>` | default（金漸層） | default | 無 | btn-primary | 🟡 同上 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| （無） | - | - | - | - |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （無） | - | - | - |

### ☑️ 勾選 / 開關
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| （無） | - | - |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| `EnhancedTable`（交易紀錄） | 預設 | 預設 | 預設 | 預設 | ✅ |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| （無） | - | - | - | - |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 交易類型圖示+文字（收入/支出/轉帳） | 手刻 div + lucide icon | 圖示+文字 | text-morandi-green / text-morandi-red / text-morandi-gold | 🔴 收入綠/支出紅用美術色 morandi-green/red 當語意色（應走 status-success/danger） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 收入 | TrendingUp | `size={16}` / 卡內 `size={24}` | text-morandi-green |
| 支出 | TrendingDown | `size={16}` / `size={24}` | text-morandi-red |
| 轉帳 | DollarSign | `size={16}` / `size={24}` | text-morandi-gold / text-morandi-primary |
| 待確認款項卡 | AlertTriangle | `size={24}` | text-morandi-gold |
| 功能卡：收款 | CreditCard | `size={24}` | text-morandi-green |
| 功能卡：報表 | BarChart3 | `size={24}` | text-morandi-primary |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 4 張收支總覽統計卡 | `<Card>` | 預設 | shadow-sm hover:shadow-md | 🟡 卡底用 bg-morandi-green/10、bg-morandi-red/10 美術色染底（語意該走 status token） |
| 2 張功能模組導航卡 | `<Card>` + `<Link>` | rounded-lg（icon 底） | hover:shadow-lg | ✅ 容器 OK；icon 底色用 bgColor 美術色 |

### 🔔 回饋 Toast / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 整頁載入 | `<ModuleLoading />` | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **收入綠 / 支出紅用美術色 morandi-green / morandi-red 當語意色**（交易類型圖示、統計卡染底、CurrencyCell variant），全站財務頁通病、應走 `status-success` / `status-danger` token。
- 🟡 統計卡背景用 `bg-morandi-green/10`、`bg-morandi-red/10`、`bg-morandi-gold/10` 美術色淡底分類收入/支出/淨利/待確認，語意分類建議走 status token。
- 🟡 分頁鈕用 default 金漸層主 CTA 樣式（語意過重，一般翻頁按鈕宜用 outline/soft）。
- 🟡 圖示尺寸寫法 `size={16}` / `size={24}` 數字制，跟黃金標準 ActionCell 的 `size="0.95em"` 不一致（此處非操作欄，影響小）。

## 備註
- 此頁交易紀錄資料來自 `useAccountingStore`（zustand store + `fetchTransactions` 手動分頁），非 entity hook / serverPagination；屬舊式資料層，但本次只盤 UI。
- CurrencyCell 的 income/expense variant 內部本就用 morandi-green/red（共用組件決定，非本頁手刻），列為全站議題而非單頁。
