# UI 盤點：`/shared-data/banks`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/shared-data/banks/page.tsx`（無 _components）
> 頁面類型：`列表（唯讀 master 表）`

## 一句話用途
讓員工查台灣金融機構代號表（中央銀行）、可搜尋（代碼/中文名/英文名）、單一大表顯示。純唯讀、無新增/編輯/刪除。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（只給 `title`、無 breadcrumb、無 primaryAction）
- **頁首**：標題 `t('moduleBanks')` =「銀行代號」；無麵包屑；無頁首動作按鈕
- **分頁**：無（一次抓全表、client-side 篩選、單一 table 全列出）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 無任何按鈕（純唯讀） | — | — | — | — | — | — |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 搜尋框（代碼/名稱） | `<Input>`（共用 ui）`max-w-sm` | text | 走 Input 預設 token | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 無 | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無（is_active 只用「✓ / —」文字顯示、不可切換） | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 手刻 `<table>`（外包 `rounded-md border`） | `py-2` | `bg-muted/50`（無 text-xs、字級用預設 sm） | 無、`hover:bg-muted/30` | table 內 colSpan row + `text-muted-foreground` | 🔴 手刻 table、非 `EnhancedTable`；表頭字級與 airports 不一致 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 「啟用」欄 | 純文字 `✓` / `—`（cell 內 emoji/dash） | 無 | 無色（繼承文字色） | 🔴 用 emoji ✓ 當狀態、非 Badge、無 status token、無顏色語意 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 無 lucide（啟用用文字 ✓ 而非 icon） | — | — | — |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| table 外框 | 手刻 `<div rounded-md border>` | `rounded-md` | 無 | 🟡 手刻、非 `<Card>` |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入中 | table 內 colSpan row + `t('loading')` 文字 | 🟡 文字、非 Skeleton |
| 無資料 | table 內 colSpan row + `t('noData')` 文字 | 🟡 文字、非統一空狀態組件 |
| 總筆數 | `<span text-muted-foreground>` `t('totalRows')` | — |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **手刻 `<table>`、非 `EnhancedTable`**（與 airports/countries 同樣手刻）。
- 🔴 **「啟用」狀態用 emoji `✓` / `—`**、無 Badge、無 `status-success` token、無顏色語意 → 與 insurance-grades 的 `<Badge>` 用法完全不一致。
- 🟡 表頭 `bg-muted/50` 字級走預設 sm（airports 用 `bg-muted/30 text-xs`）→ master 表表頭樣式互不對齊。
- 🟡 空狀態 / 載入放在 table 的 colSpan row 內（airports 放在 table 外的獨立 div）→ 同類頁空狀態結構不一致。
- 🟡 此頁直接 `useSWR`（違反紅線 F）— 技術債、記錄。

## 備註
- 結構幾乎與 countries 頁同模子（單一大 table + Input 搜尋 + 啟用欄 ✓/—）、僅欄位數不同。banks/countries 兩頁可視為「同一份手刻 table 複製貼上」、未抽共用組件。
