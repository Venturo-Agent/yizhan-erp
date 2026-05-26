# UI 盤點：`/library/archive-management`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/library/archive-management/page.tsx`
> 主要 _components：無（單檔頁、直接用 EnhancedTable + ActionCell）
> 頁面類型：`列表`

## 一句話用途
封存管理頁、列出已封存（archived）的旅遊團、可還原或永久刪除（刪除前查相依資料阻擋）。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title + icon `Archive` + breadcrumb + contentClassName）
- **頁首**：標題 `t('archivePageTitle')`、有麵包屑（首頁 / 資料庫 / 封存管理）、無頁首動作按鈕、無搜尋
- **分頁**：`EnhancedTable`（無 server pagination、一次撈全部 archived=true）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 列表行「還原」 | `<ActionCell>` | default | h-7 | `RotateCcw` | morandi-secondary | ✅ |
| 列表行「永久刪除」 | `<ActionCell>` | danger | h-7 | `Trash2` | status-danger | ✅ |

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
| `EnhancedTable` | 內建 | 內建 | 內建 | 自刻空狀態（見下） | ✅（表格本身） |

> 欄位：團號(font-medium)、團名/地點、出發日(DateCell)、封存時間(formatDate)、操作(ActionCell)。

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無（還原/刪除用 confirm 彈窗） | `confirm`（@/lib/ui/alert-dialog） | — | — | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面 icon | `Archive` | ContentPageLayout | — |
| 空狀態 | `Archive` | `h-12 w-12 opacity-30` | morandi-secondary |
| 行 還原 | `RotateCcw` | ActionCell 0.95em | morandi-secondary |
| 行 刪除 | `Trash2` | ActionCell 0.95em | status-danger |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 還原/刪除前確認 | `confirm`（type warning） | ✅ |
| 還原/刪除/載入 成功失敗 | `toast`（sonner） | ✅ |
| 刪除阻擋（有相依資料） | `toast.error` | ✅ |
| 載入中 | 手刻 spinner `<div className="animate-spin rounded-full ... border-b-2 border-morandi-gold">` | 🔴 自刻 spinner、非 `<Spinner>` |
| 空狀態（無封存團） | 手刻 `<div>` + `Archive` icon + 文字 | 🟡 自刻空狀態 |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **載入用手刻 spinner**（`animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-gold`）、專案有共用 `<Spinner>`（customers/[id]、attractions dialog 都用）→ 這裡沒用、SSOT 分岔。顏色用 `border-morandi-gold`（品牌色當 loading、可接受、但組件不統一）。
- 🟡 空狀態自刻 `<div>` + icon + 文字、無統一 EmptyState 組件（全 library 多頁通病）。
- 🟡 一次撈全部 `archived=true` 無分頁（封存量大時效能隱憂）、EnhancedTable 也沒給 serverPagination → 屬效能範疇、非 UI。

## 備註
- 操作欄已對齊黃金標準（`ActionCell`、還原 default + 刪除 danger 語意正確）、是 library 6 頁裡操作欄最乾淨的之一。
- 刪除走完整相依檢查（`checkTourDependencies`）+ 級聯清理（unlink quotes/itineraries、刪空訂單、delete entity）+ 補 invalidate（calendar/itinerary）→ 邏輯嚴謹。
- 還原走 `updateTour` entity hook（自動失效主 tours 列表）、符合紅線 F。
- 載入資料用 `loadArchivedData` 直接 `supabase.from('tours')`（非 entity hook）→ 屬紅線 F 範疇、非 UI、留記。
