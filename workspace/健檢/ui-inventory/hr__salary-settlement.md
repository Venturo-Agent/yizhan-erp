# UI 盤點：`/hr/salary-settlement`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/hr/salary-settlement/page.tsx`
> 頁面類型：`列表`（+ 新增結算 wizard dialog）

## 一句話用途
薪資結算列表（按月 batch）、點「新增薪資結算」開 wizard：多月份輸入（chips）+ 員工排除勾選 + 建立 → 跳 detail / 留列表。

## Layout 骨架
- **頁面框架**：`ListPageLayout`（icon=Wallet、breadcrumb 人資管理 / 薪資結算）
- **頁首**：title「薪資結算」、`primaryAction`「新增薪資結算」(Plus)
- **分頁**：ListPageLayout 內建、initialPageSize=15

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增薪資結算」 | `primaryAction`（ListPageLayout） | default | — | Plus | btn-primary | ✅ |
| wizard「加月份」 | `<Button>` | outline | sm | Plus | — | ✅ |
| wizard 月份 chip 移除 | 手刻 `<button>` | — | — | X(w-3 h-3) | `text-morandi-secondary hover:text-status-danger` | ⚠️ 手刻小按鈕（chip 內移除、走 status-danger token、勉可） |
| wizard footer「取消」 | `<Button>` | outline | default | — | — | ✅ |
| wizard footer「建立」 | `<Button>` | default | default | Loader2 | btn-primary | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| wizard 月份輸入（YYYY-MM、Enter 加入） | `<Input>` | text | 標準 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （無） | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| wizard 員工排除勾選 | `<Checkbox>` | ✅ |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 主列表 `EnhancedTable`（ListPageLayout） | 標準 | 內建 | 內建 | 內建 loading | ✅ |
| wizard 員工清單（手刻 flex 行） | px-3 py-2 | 無表頭 | hover bg-morandi-container/20、排除 bg-status-danger/5 | 「無 active 員工」 | ⚠️ 手刻清單（wizard 多選互動、合理） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增結算 wizard | `<Dialog>`+`<DialogContent>` (!max-w-2xl) + `<DialogFooter>` | 預設 | DialogFooter（outline 取消 + default 建立） | ⚠️ 裸 Dialog 非 FormDialog、未明設 level（待確認） |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 列表「狀態」（草稿/已確認/已取消） | `<Badge>` + 自帶 className map | 標準 | 🔴 `cancelled` 用 `bg-red-100 text-red-700`；`submitted` morandi-green；`draft` morandi-muted | 🔴 |
| wizard 月份 chips | 手刻 `inline-flex bg-morandi-gold/15 border-morandi-gold/30 rounded-md` | chip | morandi-gold | ⚠️ 手刻 chip（輸入標籤、合理） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面 icon | Wallet | ListPageLayout | morandi |
| 新增 / 加月份 | Plus | w-3 h-3 | — |
| wizard 標題 | Calendar | h-5 w-5 | morandi-gold |
| 月份 chip 移除 | X | w-3 h-3 | morandi-secondary→status-danger |
| 建立中 loading | Loader2 | w-4 h-4 animate-spin | — |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| wizard 員工清單外框 | 手刻 `rounded-lg border-morandi-border` | rounded-lg | — | ✅ |
| wizard 提醒框 | 手刻 `rounded-lg bg-morandi-container/30 border-morandi-border` | rounded-lg | — | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入/建立成功失敗/部分成功 | `toast`（sonner、success/warning/error） | ✅ |
| 列表載入 | ListPageLayout loading prop | ✅ |
| wizard 建立中 | Loader2（按鈕內）+ 防連點 disabled | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **wizard 結算月份必填星號** 用 `text-red-500`（Tailwind 預設色）— 應走 `text-status-danger`（`page.tsx` L277）
- 🔴 **列表狀態 Badge `cancelled`** 用 `bg-red-100 text-red-700`（Tailwind 預設色）— 應改用共用 `<StatusBadge tone>`（同 bonus-settlement detail 通病、三狀態三套色軌）
- ⚠️ **新增結算 wizard 用裸 `<Dialog>`** 非 `<FormDialog>`、未明設 `level`（憲法要求 Dialog 必設 level）— 待確認
- ✅ wizard 內排除狀態用 `bg-status-danger/5` + `text-status-danger`（已走 token、正確示範）

## 備註
- 結算後產請款單、不可改（紅線 D）。
- 可多月份一次建（補發場景）、員工可逐期排除。
- 員工清單走 `useEmployeesSlim`（entity hook、符合紅線 F）。
