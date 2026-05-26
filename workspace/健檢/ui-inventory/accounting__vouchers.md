# UI 盤點：`/accounting/vouchers`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/accounting/vouchers/page.tsx`（+ `components/CreateVoucherDialog.tsx`、`components/VoucherDetailDialog.tsx`）
> 頁面類型：`列表`（會計傳票管理、含日期+狀態篩選）

## 一句話用途
列出會計傳票（journal_vouchers）、可依日期區間 + 狀態篩選、檢視傳票明細、對已過帳傳票執行反沖（建借貸對調傳票）、新增多分錄傳票。

## Layout 骨架
- **頁面框架**：`ListPageLayout`
- **頁首**：標題 `t('voucherManagement')`、headerActions（起訖日期 DatePicker + 狀態 Select + 清除按鈕）+ primaryAction（新增傳票）
- **分頁**：無筆數分頁

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增傳票」 | `ListPageLayout.primaryAction` | (主CTA) | - | Plus | 金漸層 | ✅ |
| 頁首篩選「清除」 | `<Button>` | soft-gold | sm | - | morandi-gold | ✅ |
| 列表行「檢視」 | `<ActionCell>` iconOnly | (內建) | h-7 | Eye | ACTION_BUTTON_DEFAULT_TONE | ✅ 黃金標準 ActionCell |
| 列表行「反沖」（僅 posted） | `<ActionCell>` iconOnly variant=danger | (內建) | h-7 | RotateCcw | status-danger | ✅ 黃金標準 ActionCell |
| Create Dialog「新增分錄」 | `<Button>` | soft-gold | sm | Plus | morandi-gold | ✅ |
| Create Dialog「刪除分錄」（每列） | `<Button>` | ghost | sm | Trash2 | (ghost 預設) | 🟡 ghost 行內刪除、未走 ActionCell（表單內、可接受） |
| Create Dialog footer「取消」 | `<Button>` | soft-gold | default | X | morandi-gold | ✅ |
| Create Dialog footer「建立傳票」 | `<Button>` | default（金漸層） | default | - | 金漸層 | ✅ |

### ⌨️ 輸入框 Input / Textarea（Create Dialog 內）
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 說明 memo | `<Input>` | text | 共用組件 | ✅ |
| 分錄摘要（每列） | `<Input>` h-8 | text | 共用組件 | ✅ |
| 分錄借方金額（每列） | `<Input>` h-8 text-right | number | 共用組件 | ✅ |
| 分錄貸方金額（每列） | `<Input>` h-8 text-right | number | 共用組件 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 頁首篩選 起訖日期 | `<DatePicker>` w-40 ×2 | 標準 | ✅ |
| 頁首篩選 狀態 | `<Select>` w-32 | 標準 | ✅ |
| Dialog 傳票日期 | `<DatePicker>` | 標準 | ✅ |
| Dialog 關聯單據類型 | `<Select>` | 標準 | ✅ |
| Dialog 選擇單據 | `<Select>`（disabled 連動） | 標準 | ✅ |
| Dialog 分錄科目（每列） | `<Select>` h-8 | 標準 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | - | - |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 列表頁：`EnhancedTable`（透過 ListPageLayout） | 標準 | 標準 | 組件控 | 內建 | ✅ |
| Create Dialog 分錄：自刻 `<table>`（th bg-muted、含總計行） | p-2 | bg-muted 手刻 | 無 | 至少 2 列 | 🟡 表單內手刻 table（可接受） |
| Detail Dialog 分錄：自刻 `<table>`（th bg-muted/50、含合計行） | px-3 py-3 | 手刻 muted-foreground | hover:bg-muted/30 | 「無分錄資料」 | 🟡 手刻 table |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增傳票 | `FormDialog` maxWidth=5xl + customFooter | (FormDialog 預設) | 自訂：取消(soft-gold) + 建立傳票(default) | ✅（footer 走 token） |
| 傳票明細 | 裸 `<Dialog>` + `<DialogContent level={1}>` max-w-5xl | level=1 | 無 footer（純檢視） | 🟡 直接用裸 Dialog 非 FormDialog（檢視用、合理） |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 列表頁 傳票狀態 | `<StatusBadge tone={...}>` | 標準 | tone: pending/success/danger/neutral（語意 token） | ✅ 走 StatusBadge + tone（最佳實踐） |
| Detail Dialog 狀態 | `<Badge variant={...}>`（statusConfig：secondary/default/destructive/outline） | 標準 | variant 機制 | 🔴 同概念兩套：列表用 StatusBadge+tone、Detail 用 Badge+variant、不統一 |
| Create Dialog 平衡狀態 | 純文字 span「✅ 平衡 / ❌ 不平衡」 | - | text-morandi-green / text-morandi-red | 🔴 emoji + morandi-green/red 當語意色 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 新增傳票 | `Plus` | (primaryAction) | - |
| 檢視 | `Eye` | ActionCell `0.95em` | ACTION_BUTTON_DEFAULT_TONE |
| 反沖 | `RotateCcw` | ActionCell `0.95em` | status-danger |
| Dialog 新增分錄 | `Plus` | `size={14}` | - |
| Dialog 刪除分錄 | `Trash2` | `size={14}` | - |
| Dialog 取消 | `X` | `h-4 w-4` | - |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| Create Dialog 關聯單據區塊 | `<div>` bg-muted/50 rounded-lg | rounded-lg | - | ✅ |
| Detail Dialog 傳票資訊區塊 | `<div>` bg-muted/50 rounded-lg | rounded-lg | - | ✅ |
| Detail Dialog 說明區塊 | `<div>` bg-status-info/10 rounded-lg | rounded-lg | - | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 反沖確認 | `confirm()`（type=warning） | ✅ |
| 反沖/建立成功失敗 | `toast`（COMMON_MESSAGES） | ✅ |
| Detail Dialog 載入中 | 表格內「載入中...」文字 | 🟡 文字載入 |
| 列表載入中 | ListPageLayout loading prop | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **狀態標籤兩套並存**：列表頁用 `StatusBadge` + tone（語意 token、最佳）、VoucherDetailDialog 用 `Badge` + variant（statusConfig 各自一份）→ 同一個傳票狀態概念兩套寫法 + 兩份 statusConfig。
- **emoji + 美術色當語意色**：Create Dialog 平衡狀態「✅ 平衡 / ❌ 不平衡」用 emoji + morandi-green/red。
- **Detail Dialog 用裸 Dialog 非 FormDialog**：直接組 Dialog/DialogContent/DialogHeader（檢視用合理、但與 FormDialog 體系分岔）。
- **圖示尺寸混用**：ActionCell `0.95em` / Dialog 內 `size={14}` / `h-4 w-4`。

## 備註
- 列表頁操作欄是本模組唯一正確走 `ActionCell` 的頁（黃金標準）、可當其他頁改寫參考。
- 反沖符合紅線 D：不改原傳票、建借貸對調反沖傳票 ✅。走 `apiMutate` cache 失效 ✅。
- 列表 + CreateDialog 載入仍直接 `supabase.from(...)`（紅線 F 順帶記）。
