# UI 盤點：`/shared-data/airports`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/shared-data/airports/page.tsx`（無 _components、全寫在 page）
> 頁面類型：`列表（唯讀 master 表、按國家分組）`

## 一句話用途
讓員工查全世界機場代碼（IATA / ICAO）、可搜尋 + 按國家篩選、結果依國家分組顯示。純唯讀、無新增/編輯/刪除。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（只給 `title`、無 breadcrumb、無 primaryAction）
- **頁首**：標題 `t('moduleAirports')` =「機場代號」；無麵包屑；無頁首動作按鈕
- **分頁**：無（一次抓 6000+ 筆、client-side 篩選、按國家分組成多張卡）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 無任何按鈕（純唯讀） | — | — | — | — | — | — |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 搜尋框（IATA/ICAO/城市/名稱） | `<Input>`（共用 ui） | text | 走 Input 預設 token | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 國家篩選 | `<Select>`（共用 ui radix）| `SelectTrigger w-40` | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 手刻 `<table>`（每個國家一張、外包 `rounded-md border`） | `py-1.5`（緊湊） | `bg-muted/30` `text-xs font-medium` | 無、`hover:bg-muted/30` | 統一空狀態 div `border` + `text-muted-foreground` | 🔴 手刻 table、非 `EnhancedTable`；行高/表頭與其他 shared-data 頁不一致 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 分組表頭國碼 | 手刻 `<span>` `font-mono` | 無底純文字 | `text-morandi-primary` | 🟡 非 Badge、純文字 |
| 分組表頭「N 個機場」計數 | 手刻 `<span>` | 純文字 | `text-morandi-muted` | 🟡 非 Badge |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 無 icon（此頁完全沒用 lucide） | — | — | — |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 每個國家一張「分組卡」 | 手刻 `<div rounded-md border>` | `rounded-md` | 無 | 🟡 手刻、非 `<Card>` 組件 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入中 | 手刻 div `border` + `t('loading')` 文字 | 🟡 文字提示、非 Skeleton |
| 無資料 | 手刻 div `border` + `t('noData')` 文字 | 🟡 文字提示、非統一空狀態組件 |
| 總筆數提示 | `<span text-muted-foreground>` `t('totalRows')` | — |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **手刻 `<table>`、非 `EnhancedTable`**（與 banks / countries 一樣手刻、但行高不同：本頁 `py-1.5` vs banks/countries `py-2`）。
- 🔴 **唯一用「分組卡牆 + 多張小 table」結構的頁**（banks/countries 是單一大 table、insurance-grades 是 Card+Tab）→ 三種列表佈局並存、master 表之間結構完全不一致。
- 🟡 顏色用 `text-morandi-primary/secondary/muted`（美術色）標示分組層級、與 banks/countries 用 `text-muted-foreground`（shadcn 語意）不一致。
- 🟡 表頭背景 `bg-muted/30` vs banks/countries `bg-muted/50`、深淺不一。
- 🟡 此頁直接 `useSWR` 抓資料（違反紅線 F「不准頁面直接 useSWR」）— 屬技術債、非 UI 但記錄。

## 備註
- 唯一帶「篩選 Select」的 shared-data 列表頁。
- 「未設定國家」「N 個機場」「全部國家」為寫死中文字串（部分未走 i18n）、與其他欄位走 `t()` 不一致。
