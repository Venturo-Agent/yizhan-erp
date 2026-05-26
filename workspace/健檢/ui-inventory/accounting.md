# UI 盤點：`/accounting`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/accounting/page.tsx`（+ `layout.tsx`）
> 頁面類型：`儀表板`（會計模組首頁、快速入口卡片牆）

## 一句話用途
會計模組總入口、用 6 張卡片連到各子功能、並在頂部用警示卡提示「收款方式 / 請款類別 / 銀行帳戶尚未綁會計科目」的設定缺口。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title=會計系統）
- **頁首**：標題走 `t('accountingSystem')`、無麵包屑、無頁首動作按鈕
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 設定缺口卡內「前往財務設定」連結 | `<Link>`（純文字連結、非 Button） | - | - | - | text-status-info + underline | 🟡 用 Link 當按鈕（資訊提示型、可接受） |

> 本頁無任何 `<Button>` / `<ActionCell>`、所有互動都靠整張 `<Card>` 包 `<Link>` 點擊跳轉。

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
| 無表格、卡片 grid（grid-cols 1/2/3 響應式） | - | - | - | gap>0 時才顯示警示卡 | N/A |

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
| 傳票管理卡 | `FileText` | `w-6 h-6`（className） | text-status-info |
| 科目管理卡 | `BookOpen` | `w-6 h-6` | text-morandi-green 🔴 |
| 會計報表卡 | `BarChart3` | `w-6 h-6` | text-morandi-secondary |
| 票據管理卡 | `TrendingUp` | `w-6 h-6` | text-status-warning |
| 期末結轉卡 | `Calendar` | `w-6 h-6` | text-morandi-red 🔴 |
| 期初餘額卡 | `FileEdit` | `w-6 h-6` | text-morandi-gold |
| 設定缺口警示 | `AlertTriangle` | `size={20}` | text-status-warning |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 6 個快速入口 | `<Card>` p-6 + hover:shadow-lg | Card 預設 | hover:shadow-lg | ✅ |
| 圖示底色塊 | `<div>` p-3 rounded-lg | rounded-lg | - | ✅ |
| 設定缺口警示 | `<Card>` bg-status-warning-bg border-status-warning/40 | Card 預設 | - | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 讀取設定缺口失敗 | `logger.error`（靜默、無 toast） | 🟡 失敗只進 log、用戶無感 |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **美術色當語意色**：卡片圖示色用 `text-morandi-green`（科目管理）、`text-morandi-red`（期末結轉）當分類辨識色 → 雖非「成功/危險」語意、但 morandi-green / morandi-red 在全站常被誤當語意色、混入卡片入口會跟其他頁的語意用法分岔。
- **圖示尺寸寫法**：快速入口圖示用 `w-6 h-6`（className）、設定缺口警示用 `size={20}` → 同頁兩種尺寸寫法並存。
- **直接 `supabase.from()` 查詢**：本頁 useEffect 直接打 3 個 `supabase.from(...).select()` 抓設定缺口、未走 entity hook（紅線 F、非 UI 但順帶記）。

## 備註
- 整張卡片包 `<Link>`、無獨立按鈕、屬「入口牆」型儀表板。
- `quickLinks` 與 `reports`（reports/page.tsx）結構幾乎一樣（icon/title/description/color/bg）、是跨頁可抽的卡片入口 pattern。
- 設定缺口警示卡的「前往財務設定」用 `<Link>` + underline 文字、非標準按鈕、屬資訊提示可接受。
