# UI 盤點：`/shared-data/insurance-grades`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/shared-data/insurance-grades/page.tsx`（無 _components）
> 頁面類型：`列表（唯讀 master 表、Tab 切換 3 種保險）`

## 一句話用途
列出勞保 / 健保 / 勞退 3 種保險的當前生效投保級距（級數、月投保金額、生效日、來源、備註）。有 `shared_data_management.write` capability 才顯示「可編輯」、否則顯示「唯讀」徽章（但目前無實際編輯 UI、需 dev 用 SQL 補）。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（給 `title` + `icon=Shield` + **breadcrumb** + **tabs**）
- **頁首**：標題硬編碼「勞健保級距」🔴；**有麵包屑**（共用資料管理 → 勞健保級距）；**有 3 個 Tab**（勞保/健保/勞退）；無頁首動作按鈕
- **分頁**：無（依 activeTab + grade_number 排序全列）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 無操作按鈕（canEdit 也只控制提示文字、無實際編輯按鈕） | — | — | — | — | — | — |
| Tab 切換（勞保/健保/勞退） | `ContentPageLayout` 內建 tabs | — | — | — | layout token | ✅（走 layout 內建） |
| 資料來源「官方連結」 | `<a>` 超連結 | — | — | 無 | `text-morandi-gold underline` | 🟡 非 Button、純文字連結（合理） |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 無（連搜尋框都沒有） | — | — | — | 🟡 與其他 4 頁有搜尋框不一致 |

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
| 手刻 `<table>`（包在 `<Card>` 內 + `overflow-x-auto`） | `py-3`（比 banks/countries 鬆） | `bg-morandi-container/30` `text-xs text-morandi-secondary` | 無、row 間 `border-t border-morandi-muted/10` | 用 `<Card p-12 text-center>` 顯示「尚無資料」 | 🔴 手刻 table、且表頭/行高/空狀態三項都與 banks/countries/airports 不同 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 「唯讀」徽章（無 write capability 時） | `<Badge variant="outline">` | pill | outline | ✅ 唯一用 `<Badge>` 組件的 shared-data 頁 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面 icon（layout） | `Shield` | layout 控制 | layout |
| 說明卡 icon | `Shield` | `w-5 h-5` + `strokeWidth={1.5}` | `text-morandi-gold` |
| 載入中 spinner | `Loader2` | `w-5 h-5 animate-spin` | 繼承 `text-morandi-secondary` |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 說明卡（標題/描述/費率） | `<Card p-5 mb-4>` | Card token | Card token | ✅ 用 `<Card>` 組件 |
| 表格外框 | `<Card overflow-hidden>` | Card token | Card token | ✅ 用 `<Card>` 組件 |
| 空狀態卡 | `<Card p-12 text-center>` | Card token | Card token | ✅ |
| Tab | layout 內建 tabs | — | — | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入失敗 / 載入失敗 HTTP | `toast.error`（sonner） | ✅ 唯一用 toast 的 shared-data 頁 |
| 載入中 | `<Loader2 animate-spin>` + 文字「載入中...」 | 🟡 spinner、非 Skeleton；且「載入中...」硬編碼非 `t()` |
| 空狀態 | `<Card>` 含說明文字 | ✅ |
| 級距不完整警告 | 手刻 `<p text-orange-600>` + ⚠ emoji | 🔴 用 Tailwind 預設色 `text-orange-600`（應走 `text-status-warning`） |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **Tailwind 預設色違規**：級距不完整警告用 `text-orange-600`（UI 紅線禁用預設色、應走 `text-status-warning`）。
- 🔴 **此頁是 5 頁裡的「異類」**：唯一有 breadcrumb、唯一有 Tab、唯一用 `<Card>` 組件、唯一用 `<Badge>`、唯一用 `toast`、唯一用 lucide icon、唯一沒搜尋框 → 跟 banks/countries/airports 的 UI 風格幾乎沒共通點。
- 🔴 表格表頭用 `bg-morandi-container/30` + `text-morandi-secondary`（美術色）、與 banks/countries 的 `bg-muted/50`、airports 的 `bg-muted/30` 三套表頭並存。
- 🟡 「勞健保級距」「載入中...」標題與載入文字硬編碼、未走 `t()`（其他頁部分走 i18n）。
- 🟡 走 `fetch('/api/...')` + 手動 `setList`（非 useSWR、也非 entity hook）→ 又是第三種資料讀取寫法（airports/banks/countries 用 useSWR、此頁用 fetch+useState）。

## 備註
- 結構最完整、最貼近黃金標準框架（用 Card/Badge/toast/breadcrumb/tabs）、但正因如此跟其他 4 頁「裸 div + 手刻 table」差異最大。
- canEdit 控制的只有提示文字、無實際新增/編輯/刪除入口（編輯 UI 待補、目前靠 SQL）。
- 「漫途 admin」字樣出現在提示文字（`漫途 admin：請從勞動部...`）— 屬 UI 文案、非 code 特權判斷、但用詞觸碰憲法 §0.1「admin 用詞紀律」、建議改「有 shared_data_management.write 的員工」。
