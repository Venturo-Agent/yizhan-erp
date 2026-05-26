# UI 盤點：`/hr/bonus-settlement/[tourId]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/hr/bonus-settlement/[tourId]/page.tsx`
> 頁面類型：`詳情`（單一團的獎金明細、唯讀）

## 一句話用途
查看單一旅遊團的獎金明細（員工列、金額、類型、狀態），純唯讀、無任何寫入動作。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（icon=Award、breadcrumb 人資管理 / 獎金結算 / 團號）
- **頁首**：title 用團號、breadcrumb 三層、無 primaryAction
- **主體**：摘要 Card + 員工明細 Card（手刻 table）
- **分頁**：無（明細一次列出）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| （無、唯讀頁） | — | — | — | — | — | — |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| （無） | — | — | — | — |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （無） | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| （無） | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 員工明細（手刻 `<table>`） | px-4 py-3 | `bg-morandi-container/30 text-morandi-secondary text-xs` | border-t only | 無明確空狀態（items 空時表身空） | ⚠️ 手刻 table、非 EnhancedTable（唯讀明細、無搜尋/分頁、可接受但無空狀態） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| （無） | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 獎金狀態（待結算/已結算/已取消） | `<Badge>` + 自帶 className map | 標準 | 🔴 `cancelled` 用 `bg-red-100 text-red-700`（Tailwind 預設色）、`settled` 用 morandi-green、`pending` 用 morandi-muted | 🔴 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面 icon / 空狀態 | Award | ContentPageLayout | morandi |
| 載入中 | Loader2 | w-5 h-5 animate-spin | morandi-secondary |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 摘要卡 | `<Card>` p-5 | Card 預設 | Card 預設 | ✅ |
| 員工列表卡 | `<Card>` overflow-hidden | Card 預設 | Card 預設 | ✅ |
| 找不到團 | `<Card>` p-12 text-center | Card 預設 | Card 預設 | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入失敗 | `toast.error`（sonner） | ✅ |
| 載入中 | Loader2 spin + 「載入中...」 | ✅ |
| 找不到團 | Card「找不到團」 | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **獎金狀態 Badge `cancelled`** 用 `bg-red-100 text-red-700`（Tailwind 預設色）— 應走 `bg-status-danger-bg text-status-danger` token（`page.tsx` L44）。狀態 badge 應改用全站 `<StatusBadge tone>`（與 `/hr` 員工狀態一致）。
- ⚠️ `settled` 狀態用 `morandi-green`（美術色當語意成功色）、`pending` 用 morandi-muted — 同一 STATUS_BADGE 物件混用 morandi 美術色 + Tailwind 預設色、三種狀態三套色軌不統一。
- ⚠️ 員工明細手刻 table 無空狀態處理（items 為空時表身空白）。

## 備註
- 唯讀頁、無寫入、無後門（符合紅線 D）。
- 金額用 `text-morandi-gold tabular-nums`（與列表頁一致）。
- 建議：STATUS_BADGE 改用共用 `<StatusBadge>`、可同時解掉 Tailwind 預設色 + 美術色雙問題。
