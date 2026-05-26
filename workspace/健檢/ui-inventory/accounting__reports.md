# UI 盤點：`/accounting/reports`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/accounting/reports/page.tsx`
> 頁面類型：`儀表板`（報表入口卡片牆）

## 一句話用途
會計報表總入口、4 張卡片連到總帳 / 試算表 / 損益表 / 資產負債表。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title=會計報表）
- **頁首**：標題 `t('accountingReports')`、無麵包屑、無頁首動作
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 無獨立按鈕、整張 Card 包 Link 跳轉 | `<Link>` + `<Card>` | - | - | - | - | N/A |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 無 | - | - | - | - |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 無 | - | - | - |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | - | - |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 無表格、卡片 grid（md:grid-cols-2） | - | - | - | - | N/A |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | - | - | - | - |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 無 | - | - | - | - |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 總帳卡 | `BookOpen` | `w-6 h-6` | text-status-info |
| 試算表卡 | `BarChart3` | `w-6 h-6` | text-morandi-green 🔴 |
| 損益表卡 | `TrendingUp` | `w-6 h-6` | text-morandi-secondary |
| 資產負債表卡 | `DollarSign` | `w-6 h-6` | text-status-warning |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 4 個報表入口 | `<Card>` p-6 + hover:shadow-lg | Card 預設 | hover:shadow-lg | ✅ |
| 圖示底色塊 | `<div>` p-3 rounded-lg | rounded-lg | - | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無（純靜態入口） | - | - |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **美術色當分類色**：試算表卡圖示用 `text-morandi-green`（同 /accounting 首頁的 pattern）。
- **與 /accounting 首頁卡片牆結構重複**：`reports` 陣列與首頁 `quickLinks` 結構完全一致（icon/title/description/color/bg + Link+Card 渲染）、是跨頁可抽的入口卡片 pattern。

## 備註
- 純靜態入口牆、無資料讀取、無互動按鈕。
