# UI 盤點：`/library`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/library/page.tsx`
> 頁面類型：`儀表板`（module 入口卡片牆）

## 一句話用途
資料庫 library 的總入口、用大卡片導向四個子模組（景點 / 供應商 / 封存管理 / 顧客）。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title 走 i18n `t('pageTitle')`）
- **頁首**：只有標題、無麵包屑、無頁首動作按鈕
- **分頁**：無
- **主體**：`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6` 卡片牆

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 四張模組導覽卡（整張可點） | 手刻 `<div onClick>` | — | — | 卡內 icon | bg-card / border-border | 🟡 非按鈕、是可點卡片（見備註） |

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
| 無（純卡片牆） | — | — | — | — | — |

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
| 景點卡 | `MapPin` | `size={24}` | `text-white`（底色 `bg-status-info`） |
| 供應商卡 | `Building2` | `size={24}` | `text-white`（底色 `bg-status-info`） |
| 封存管理卡 | `Archive` | `size={24}` | `text-white`（底色 `bg-morandi-red` 🔴） |
| 顧客卡 | `Contact` | `size={24}` | `text-white`（底色 `bg-status-info`） |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 模組導覽卡 | 手刻 `<div>`（`bg-card border border-border rounded-lg p-6`） | `rounded-lg` | `hover:shadow-md` | 🟡 沒用 `<Card>` 組件、但用 token |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | — | — |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **封存管理卡的 icon 底色用 `bg-morandi-red`**（美術色當語意色）。其餘三卡用 `bg-status-info`。封存非「危險」語意、若要紅應走 `bg-status-danger`、但這裡更像是想用紅當「警示提醒」的美術用法 → 顏色軌分岔、建議統一。
- 🟡 模組卡是手刻 `<div onClick>`、不是 `<Card>` 組件、也沒有 `<Button>`。整頁無共用按鈕（屬於入口頁、可接受、但卡片可考慮抽共用 component）。

## 備註
- 全頁無任何表單 / 表格 / dialog、是純導覽入口。
- 卡片 hover 用 `hover:border-morandi-gold/20` + `hover:shadow-md`、走 token、無 Tailwind 預設色。
- 卡片 icon 容器 `w-12 h-12 rounded-lg`、icon 一律白色置中。
