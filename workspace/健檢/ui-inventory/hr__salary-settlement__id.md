# UI 盤點：`/hr/salary-settlement/[id]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/hr/salary-settlement/[id]/page.tsx`
> 頁面類型：`詳情`（單一薪資結算 batch、含「確認結算」+「刪除草稿」動作）

## 一句話用途
查看單一薪資結算明細（員工逐列：應發/自願提撥/實領/雇主勞退/公司支出），draft 狀態可「確認結算」（產請款單）或「刪除草稿」。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（icon=Wallet、breadcrumb 人資管理 / 薪資結算 / 期間）
- **頁首**：title「{period} 薪資」、`primaryAction`「確認結算」(Check、僅 draft 顯示)
- **主體**：摘要 Card + 員工明細 Card（手刻 table、含 tfoot 合計）
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「確認結算」（draft） | `primaryAction`（ContentPageLayout） | default | — | Check | btn-primary | ✅ |
| 摘要卡「刪除草稿」（draft） | `<Button>` | ghost | sm | Trash2 | 🔴 `className="text-red-600"`（Tailwind 預設色） | 🔴 |
| 請款單「查看」連結 | 手刻 `<a>` | — | — | — | `text-morandi-gold underline` | ⚠️ 手刻錨點連結（非 Button、走 morandi-gold、勉可） |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| （無） | — | — | — | — |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （無） | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| （無） | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 員工薪資明細（手刻 `<table>` 含 tfoot） | px-4 py-3 | `bg-morandi-container/30 text-morandi-secondary text-xs` | border-t only | 無明確空狀態 | ⚠️ 手刻 table、非 EnhancedTable（唯讀明細 + 合計列、可接受） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 確認結算 / 刪除草稿確認 | `confirm`（`@/lib/ui/alert-dialog`、共用確認框） | — | 共用 | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 摘要卡 狀態（草稿/已確認/已取消） | `<Badge>` + 自帶 className map | 標準 | 🔴 `cancelled` 用 `bg-red-100 text-red-700`；`submitted` morandi-green；`draft` morandi-muted | 🔴 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 頁面 icon / 空狀態 | Wallet | ContentPageLayout | morandi |
| 確認結算 | Check | — | — |
| 刪除草稿 | Trash2 | w-4 h-4 | 🔴 text-red-600 |
| 載入中 | Loader2 | w-5 h-5 animate-spin | morandi-secondary |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 摘要卡 | `<Card>` p-5 | Card 預設 | Card 預設 | ✅ |
| 員工明細卡 | `<Card>` overflow-hidden | Card 預設 | Card 預設 | ✅ |
| 找不到結算 | `<Card>` p-12 | Card 預設 | Card 預設 | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 確認/刪除成功失敗 | `toast`（sonner） | ✅ |
| 確認/刪除前 | `confirm` 對話框 | ✅ |
| 載入中 | Loader2 spin + 「載入中...」 | ✅ |
| 找不到 | Card「找不到結算紀錄」 | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **「刪除草稿」按鈕** 用 `<Button variant=ghost className="text-red-600">`（Tailwind 預設色 red-600）— 應走 `variant=destructive` 或 `text-status-danger` token（`page.tsx` L245）
- 🔴 **狀態 Badge `cancelled`** 用 `bg-red-100 text-red-700`（Tailwind 預設色）— 應改用共用 `<StatusBadge tone>`（與 bonus detail / salary 列表同通病）
- 🔴 **明細表內金額色** 多處 Tailwind 預設色：自願提撥 `text-red-600`（L287）、勞保警示 `text-orange-600`（L283）— 應走 `text-status-danger` / `text-status-warning` token
- ⚠️ 員工明細手刻 table 無空狀態處理。
- ⚠️ 「請款單查看」用手刻 `<a href>` 而非 Next Link / Button。

## 備註
- 確認後產請款單、不可改（紅線 D）；draft 才可刪。
- 明細表是本頁最 token-不對齊的區塊（金額語意色全用 Tailwind 預設 red/orange）。
- 建議：本頁 + 列表 + bonus detail 的 STATUS_BADGE 統一抽成共用 `<StatusBadge>`、一次解三頁的 cancelled 紅色硬編碼。
