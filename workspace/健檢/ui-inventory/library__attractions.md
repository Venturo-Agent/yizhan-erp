# UI 盤點：`/library/attractions`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/library/attractions/page.tsx` → `_components/AttractionsPage.tsx`
> 主要 _components：`tabs/RegionsTab.tsx`、`tabs/AttractionsTab.tsx` → `AttractionsList.tsx`、`AttractionsDialog.tsx` → `attraction-dialog/AttractionForm.tsx` + `AttractionImageUpload.tsx`
> 頁面類型：`列表`（4 tab + 大型新增/編輯 dialog）

## 一句話用途
景點資料庫、4 分頁（國家地區 / 景點 / 飯店 / 餐廳）、可搜尋 / 國家+分類篩選 / 上下移排序 / 啟用停用 / 標記已驗證 / 新增編輯（含多圖上傳 + 座標查詢 + AI 潤飾）。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title + icon `MapPin` + breadcrumb + tabs + search + filters + clearFilters + primaryAction）
- **頁首**：標題 + 麵包屑（資料庫 / 景點資料庫）、4 個 icon tab、依 tab 動態 search/filter/新增 label
- **分頁**：`EnhancedTable initialPageSize={15}`（client 分頁）；tab 內容 lazy load（Suspense）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增」（依 tab 變 label） | `primaryAction` | — | — | `Plus` | btn-primary | ✅ |
| 列表行「上移」 | `<Button variant=ghost size=sm>` 套 `ACTION_BUTTON_BASE+DEFAULT_TONE` | ghost+常數 | sm | `ChevronUp` | morandi-secondary | 🟡 手拼骨架、非 ActionCell |
| 列表行「下移」 | 同上 | ghost+常數 | sm | `ChevronDown` | morandi-secondary | 🟡 同上 |
| 列表行「編輯」 | 同上 | ghost+常數 | sm | `Edit2` | morandi-secondary | 🟡 同上 |
| 列表行「啟用/停用」 | 同上 | ghost+常數 | sm | `Power` | `text-morandi-green`(啟用) / morandi-secondary 🔴 | 🟡 手拼 + 美術色 |
| 列表行「刪除」 | `<Button>` 套 `ACTION_BUTTON_BASE + status-danger` | ghost+常數 | sm | `Trash2` | status-danger | 🟡 手拼骨架 |
| Dialog 標題「標記已驗證」 | `<Button variant=soft-gold size=sm>` | soft-gold | sm h-7 | `CheckCircle2` | 手寫 `text-morandi-gold border-morandi-gold bg-morandi-gold/10` | 🟡 soft-gold 又疊手寫 className |
| Dialog 標題「刪除」（編輯+權限） | `<Button variant=soft-gold size=sm>` | soft-gold | sm h-7 | `Trash2` | 手寫 `text-status-danger border-status-danger/50` | 🟡 soft-gold 疊手寫 danger |
| Dialog 提交/取消 | `FormDialog` 內建 footer | — | — | — | 統一 | ✅ |
| 國家篩選清除 | `Combobox showClearButton` | — | — | — | 內建 | ✅ |
| RegionsTab 城市彈窗觸發 | `<Button>` + Switch（啟用國家） | 待確認 | — | — | — | 待確認 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 頁首搜尋 | ContentPageLayout 內建 | text | 內建 | ✅ |
| Dialog 名稱/英文名/座標等 | `<Input>`（AttractionForm） | text | 內建 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 頁首「國家」篩選 | `<Combobox>`（可搜尋、showClearButton） | 共用 | ✅ |
| 頁首「分類」篩選（僅景點 tab） | `<Combobox>` | 共用 | ✅ |
| Dialog 國家/地區/城市/分類 | `<Select>`（shadcn、AttractionForm） | 共用 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| Dialog 表單 checkbox（AttractionForm） | `<Checkbox>`（共用 shadcn） | ✅ |
| RegionsTab 國家啟用/停用 | `<Switch>`（共用 shadcn） | ✅ |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| `EnhancedTable`（景點/飯店/餐廳 tab） | 內建 | 內建（部分 sortable） | 內建 | 內建 loading | ✅ |
| RegionsTab 按子區域分組清單 | 自刻折疊清單（非 EnhancedTable） | — | — | — | 🟡 自刻分組 UI |

> 景點欄：圖片(縮圖)、名稱(+待驗證 ⚠ tooltip + 英文名)、分類(badge)、描述、時長、標籤(chips)、狀態(badge)。

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增/編輯景點（飯店/餐廳共用） | `FormDialog`（maxWidth 5xl、loading prop、dynamic import） | FormDialog | FormDialog 統一 | ✅ |
| RegionsTab 城市清單彈窗 | `Dialog`（DialogContent/Header/Title） | 待確認 level | 待確認 | 🟡 用底層 Dialog |
| 標題列「標記已驗證」用 `prompt`/`alert`（新增圖片網址） | `@/lib/ui/alert-dialog` | — | — | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 分類 badge（列表） | 手刻 `<span>` | rounded | `bg-morandi-blue/10 text-morandi-blue` 🔴 | 🔴 美術色 |
| 標籤 chips（列表） | 手刻 `<span>` | rounded | `bg-morandi-container text-morandi-secondary` | 🟡 中性、可接受 |
| 啟用/停用狀態（列表） | 手刻 `<span>` | rounded | `bg-morandi-green/80 text-white`(啟用) 🔴 / `bg-morandi-container`(停用) | 🔴 啟用用美術綠當語意色 |
| 待驗證警示（列表名稱） | `AlertTriangle` + `Tooltip` | icon | `text-status-warning` | ✅ |
| Dialog 已驗證徽章 | `<StatusBadge tone="success">`（共用組件） | 組件 | status token | ✅ |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面 / 景點 tab | `MapPin` | ContentPageLayout / size 16 | morandi-muted（空圖） |
| 地區 tab | `Globe` | tab icon | — |
| 飯店 tab | `Hotel` | tab icon | — |
| 餐廳 tab | `UtensilsCrossed` | tab icon | — |
| 頁首新增 | `Plus` | primaryAction | — |
| 行 上移/下移 | `ChevronUp`/`ChevronDown` | `size="0.95em"` | morandi-secondary |
| 行 編輯 | `Edit2` | `size="0.95em"` | morandi-secondary |
| 行 啟用停用 | `Power` | `size="0.95em"` | morandi-green / morandi-secondary 🔴 |
| 行 刪除 | `Trash2` | `size="0.95em"` | status-danger |
| 列表 待驗證 | `AlertTriangle` | `size={14}` | status-warning |
| Dialog 標記驗證 | `CheckCircle2` | `size={14}` | morandi-gold |
| Dialog 刪除 | `Trash2` | `size={14}` | status-danger |
| Dialog AI 潤飾 | `Sparkles`（AttractionForm） | 待確認 | — |
| RegionsTab 展開 | `ChevronDown`/`ChevronRight` / `Check` | size 14 | morandi-secondary |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 頁面 tabs | ContentPageLayout tabs + shadcn `Tabs`/`TabsContent`（雙層） | — | — | 🟡 雙層 tabs 同步 |
| 景點縮圖 | `<img>` `rounded border border-border shadow-sm` | rounded | shadow-sm | ✅ token |
| RegionsTab 子區域分組 | 自刻折疊面板 | 待確認 | — | 🟡 自刻 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 標記驗證/刪除/AI 結果 | `toast`（sonner） | ✅ |
| 圖片格式 / 拖曳提示 | `alert`/`prompt`（@/lib/ui/alert-dialog） | ✅ |
| tab 切換載入 | Suspense fallback 自刻文字「載入中」 | 🟡 自刻 fallback |
| 空圖佔位 | 手刻 `<div>` + `MapPin` | 🟡 自刻 |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **大量美術色當語意/分類色**：分類 badge `bg-morandi-blue/10 text-morandi-blue`、啟用狀態 `bg-morandi-green/80 text-white`、啟用 Power 圖示 `text-morandi-green` → 啟用「成功/正常」語意應走 `status-success`、分類色應走中性 token。
- 🟡 **列表 5+ 顆操作鈕（上移/下移/編輯/啟用/刪除）全沒走 `ActionCell`**、而是逐顆 `<Button variant=ghost size=sm>` 手套 `ACTION_BUTTON_BASE` 常數。功能上對齊黃金標準骨架、但跟 customers/archive（用 ActionCell）形式不統一。本頁操作最多、最該抽 ActionCell。
- 🟡 **Dialog 標題列的 soft-gold 按鈕又疊手寫 className**（`text-morandi-gold border-morandi-gold bg-morandi-gold/10` / `text-status-danger border-status-danger/50`）→ variant 已給配色又手動覆寫、配色軌混亂。
- 🟡 RegionsTab 自刻折疊分組清單（非 EnhancedTable）+ 自刻城市 `Dialog`（底層）、跟其他三 tab 的表格風格不同。
- 🟡 RegionsTab 內 `import useSWR` + 散刻 `supabase.from()`（fetchRefAndWorkspaceCountries）→ 屬紅線 F（讀取 SSOT）範疇、非 UI、留記。

## 備註
- 主新增/編輯 dialog（807 行）走 dynamic import 切 chunk、符合 bundle 優化紅線。
- 編輯權限 gate：`can(CAPABILITIES.DATABASE_MANAGE_ATTRACTIONS)` 控 readOnly + 刪除鈕顯示、權限對齊正確。
- AttractionForm 含 AI 潤飾（`Sparkles` 按鈕、走 `apiMutate`）+ 座標查詢 `CoordinateSearch` + 多圖上傳 `AttractionImageUpload`（拖放 / URL / AI 編輯）、本次未逐元素深掃內部上傳區。
- AttractionsMap.tsx 存在但本頁 4 tab 未直接 render（待確認是否仍掛載）。
