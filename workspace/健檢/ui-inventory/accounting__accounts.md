# UI 盤點：`/accounting/accounts`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/accounting/accounts/page.tsx`（+ `components/CreateAccountDialog.tsx`、`components/EditAccountDialog.tsx`、`components/accounts-tabs.ts`）
> 頁面類型：`列表`（會計科目表、樹狀可展開折疊）

## 一句話用途
管理會計科目表（chart_of_accounts）、樹狀展開父子科目、可標常用 / 新增子科目 / 編輯 / 刪除、含「科目列表 / 期初餘額」分頁切換。

## Layout 骨架
- **頁面框架**：`ListPageLayout`（含 statusTabs 分頁）
- **頁首**：標題 `t('accountChartManagementWithCount', { count })`、有 statusTabs（科目列表 / 期初餘額）、頁首動作 = headerActions（全部展開 / 全部折疊）+ primaryAction（新增科目）
- **分頁**：statusTabs（路由切換、`ACCOUNTS_TABS`）、列表本身無筆數分頁（樹狀全載）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增科目」 | `ListPageLayout.primaryAction` | (內建主CTA) | - | Plus | 金漸層 | ✅ |
| 頁首「全部展開」 | `<Button>` | soft-gold | sm | - | morandi-gold | ✅ |
| 頁首「全部折疊」 | `<Button>` | soft-gold | sm | - | morandi-gold | ✅ |
| 列表行「常用」星號 | 手刻 `<button>` | - | - | Star | fill-status-warning / muted | 🔴 手刻 button、未走 ActionCell |
| 列表行「展開/折疊」 | 手刻 `<button>` | - | - | ChevronDown/Right | muted-foreground | 🔴 手刻 button（樹狀互動、ActionCell 不支援、可接受） |
| 列表行「新增子科目」 | `<Button>` variant=ghost + 套 ACTION_BUTTON_BASE | ghost | sm | Plus | ACTION_BUTTON_DEFAULT_TONE | 🔴 套骨架常數但沒走 ActionCell 組件 |
| 列表行「編輯」 | `<Button>` variant=ghost + 套 ACTION_BUTTON_BASE | ghost | sm | Edit2 | ACTION_BUTTON_DEFAULT_TONE | 🔴 套骨架常數但沒走 ActionCell 組件 |

### ⌨️ 輸入框 Input / Textarea（在 Create/Edit Dialog 內）
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 科目代號 | `<Input>` | text | 共用組件 | ✅ |
| 科目名稱 | `<Input>` | text | 共用組件 | ✅ |
| 說明 | `<Textarea>` rows=3 | textarea | 共用組件 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown（Dialog 內）
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 科目類型 | `<Select>`（shadcn） | 標準 | ✅ |
| 父科目（選填） | `<Select>` | 標準 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle（Dialog 內）
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 啟用狀態 | `<Switch>` | ✅ |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| `EnhancedTable`（透過 ListPageLayout） | 標準 | 標準 | 由組件控 | ListPageLayout 內建 | ✅ |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增科目 | `FormDialog` maxWidth=lg | (FormDialog 預設) | 內建 submitLabel | ✅ |
| 編輯科目 | `FormDialog` maxWidth=lg + customFooter | (預設) | 自訂 footer：刪除(destructive) + 取消(soft-gold) + 確認更新(default) | 🟡 自訂 footer、刪除鈕帶 Trash2、整體對齊 token 但 footer 自刻 |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 科目類型（資產/負債…） | `<Badge>` variant=outline + typeConfig.color | outline | text-status-info / morandi-red / morandi-secondary / morandi-green / status-warning / morandi-gold | 🔴 用 morandi-red/green 當分類色 |
| 系統科目 | `<Badge>` variant=secondary | secondary | - | ✅ |
| 啟用/停用狀態 | `<Badge>` variant=default/outline | - | - | ✅ |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 常用標記 | `Star` | `size={18}` | fill-status-warning / muted-foreground |
| 新增/新增子科目 | `Plus` | `size="0.95em"`（行內按鈕） | ACTION_BUTTON_DEFAULT_TONE |
| 編輯 | `Edit2` | `size="0.95em"` | ACTION_BUTTON_DEFAULT_TONE |
| 展開 | `ChevronDown` | `h-4 w-4` | muted-foreground |
| 折疊 | `ChevronRight` | `h-4 w-4` | muted-foreground |
| 刪除（Edit dialog footer） | `Trash2` | `h-4 w-4` | (destructive button 內) |
| 取消（Edit dialog footer） | `X` | `h-4 w-4` | (soft-gold button 內) |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 系統科目提示（Edit dialog） | `<div>` bg-morandi-gold/10 rounded-md | rounded-md | - | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 新增/更新/刪除成功失敗 | `toast.success/error`（sonner） | ✅ |
| 刪除確認 | `confirm()`（`@/lib/ui/alert-dialog`） | ✅ |
| DB 錯誤翻譯 | `translateDbError()` | ✅ |
| 載入中 | ListPageLayout loading prop | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **行內操作按鈕沒走 ActionCell**：新增子科目 + 編輯用 `<Button variant=ghost>` 手套 `ACTION_BUTTON_BASE + ACTION_BUTTON_DEFAULT_TONE`、視覺對齊但組件不對齊（黃金標準是 ActionCell）。常用星號 + 展開折疊用純手刻 `<button>`。
- **美術色當分類色**：科目類型 Badge 用 `text-morandi-red`（負債）、`text-morandi-green`（收入）當分類辨識色。
- **圖示尺寸混用**：星號 `size={18}` / 行內按鈕 `size="0.95em"` / chevron `h-4 w-4` 三種寫法並存。
- **Edit dialog 自刻 footer**：用 customFooter 排「刪除 / 取消 / 確認更新」、變數命名 `confirmed2`（checks 頁也有、命名隨意）。

## 備註
- 樹狀展開/折疊 + 縮排（每層 20px paddingLeft）是這頁特有互動。
- `accounts-tabs.ts` 把「期初餘額」整合進科目管理當第二分頁、不再獨立 sidebar 入口。
- 列表直接 `supabase.from('chart_of_accounts')` 載入、未走 entity hook（toggleFavorite / 刪除走 `@/data` entity）。
