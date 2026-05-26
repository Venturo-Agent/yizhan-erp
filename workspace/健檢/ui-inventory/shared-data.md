# UI 盤點：`/shared-data`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/shared-data/page.tsx`
> 頁面類型：`儀表板（功能入口導覽）`

## 一句話用途
共用資料管理區的「總入口」、用卡片列出 4 個子模組（銀行 / 國家 / 機場 / 景點圈）、點卡片導航進去。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（只給 `title`、無 breadcrumb、無 primaryAction）
- **頁首**：標題 `t('title')` =「共用資料」；無麵包屑；無頁首動作按鈕
- **分頁**：無（固定 4 張卡片 grid）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 4 張模組導航卡（整張可點） | 手刻 `<button type="button">` | — | 自刻 p-6 | 各卡一個 lucide（Landmark/Globe/Plane/MapPin） | `bg-card` + `border` + `hover:border-primary` | 🟡 卡片式導航非按鈕情境、但仍是手刻 button（非 ActionCell / Button、合理但記錄） |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

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
| 無表格、用 grid 卡片牆（`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`） | — | — | — | — | — |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 銀行卡 | `Landmark` | `size-6`（在彩色圓底內） | 白字 `text-white` + 底 `bg-status-info` |
| 國家卡 | `Globe` | `size-6` | 白字 + 底 `bg-status-success` |
| 機場卡 | `Plane` | `size-6` | 白字 + 底 `bg-morandi-blue` 🔴 |
| 景點卡 | `MapPin` | `size-6` | 白字 + 底 `bg-morandi-gold`（品牌主色當卡片底）🟡 |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 模組導航卡 | 手刻 `<button>` + `bg-card border` | `rounded-lg`（卡）+ `rounded-md`（icon 底） | `hover:shadow-md` | 🟡 非用 `<Card>` 組件、手刻 div/button 卡片 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無（純靜態導覽、不抓資料） | — | — |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **icon 底色混用語意色 + 美術色當分類色**：`bg-status-info` / `bg-status-success`（語意色被借來當「分類辨識色」）跟 `bg-morandi-blue` / `bg-morandi-gold`（美術色）並存、4 張卡 4 套色彩來源不一致。語意 token（success/info）被當裝飾色用、屬軌道分岔。
- 🟡 卡片用手刻 `<button>` + `bg-card border`、未走 `<Card>` 組件、也非任何 Button variant（導航卡情境合理、但與其他頁的 `<Card>` 用法不一致）。
- 🟡 `hover:border-primary` / `group-hover:text-primary` 用 shadcn `primary` 而非 `morandi-gold` 品牌主色。

## 備註
- 此頁列出 4 個模組（banks / countries / airports / attractions）、但 sidebar / 路由實際另有 `insurance-grades`（勞健保級距）未出現在這張入口卡牆 → 入口頁與實際子頁清單不同步（insurance-grades 進不來這個入口、只能從 sidebar 進）。待確認是否刻意。
- 純前端靜態導覽、無資料讀取、無權限判斷。
