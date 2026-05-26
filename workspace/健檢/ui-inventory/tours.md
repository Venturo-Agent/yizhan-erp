# UI 盤點：`/tours`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/tours/page.tsx` → `_components/ToursPage.tsx`（含 TourFilters / TourTable / TourTableColumns / TourActionButtons / TourFormShell / DeleteConfirmDialog 等）
> 頁面類型：`列表`（含開團 / 提案 / 模板 三種建立流程 + 多個對話框）

## 一句話用途
讓員工瀏覽 / 搜尋 / 篩選旅遊團（進行中 / 已返國 / 已結案 / 提案 / 模板），並開團、報名、編輯、封存、刪除、複製模板、提案轉正式團。

## Layout 骨架
- **頁面框架**：自刻 `<div className="h-full flex flex-col">`（非 ListPageLayout）；頁首走 `ResponsiveHeader`（包在 TourFilters 內）
- **頁首**：`ResponsiveHeader` 標題 `旅遊團`、icon `MapPin`、有麵包屑（旅遊團 → /tours）、含搜尋框、5 個 tab（進行中 / 已返國 / 已結案 / 提案 / 模板）、右上「新增專案」走 DropdownMenu（開團 / 提案 / 開模板）
- **分頁**：有，`EnhancedTable` 的 `serverPagination`（server-side、固定 pageSize）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增專案」DropdownTrigger | `<Button>` | header-outline | sm | Plus | morandi-gold 漸層 | ✅ |
| 列表行「編輯」 | `<Button variant="ghost">` + 套 `ACTION_BUTTON_BASE` + `ACTION_BUTTON_DEFAULT_TONE` | ghost | sm | Edit2 | morandi-secondary | 🟡 沒走 ActionCell（手刻組合、但用了共用骨架常數、視覺對齊） |
| 列表行「報名」(正式團) | `<Button variant="ghost">` + ACTION_BUTTON_BASE | ghost | sm | UserPlus | morandi-gold（語意） | 🟡 同上、且 gold 當「報名」語意色 |
| 列表行「開團」(提案/模板) | `<Button variant="ghost">` + ACTION_BUTTON_BASE | ghost | sm | Send | morandi-gold | 🟡 同上 |
| 列表行「複製」(模板) | `<Button variant="ghost">` + ACTION_BUTTON_BASE | ghost | sm | Copy | morandi-gold | 🟡 同上 |
| 列表行「封存 / 還原」 | `<Button variant="ghost">` + ACTION_BUTTON_BASE + DEFAULT_TONE | ghost | sm | Archive / ArchiveRestore | morandi-secondary | 🟡 沒走 ActionCell |
| 列表行「刪除」 | `<Button variant="ghost">` + ACTION_BUTTON_BASE + `text-status-danger hover:bg-status-danger-bg` | ghost | sm | Trash2 | status-danger | 🟡 顏色 token ✅、但仍手刻非 ActionCell |
| 建團表單「取消」 | `<Button>` | soft-gold | default | X (size=16) | morandi-gold | ✅ variant 對；🔴 圖示尺寸寫 `size={16}`（非 0.95em） |
| 建團表單「送出」 | `<Button>` | soft-gold | default | 無 | morandi-gold | 🟡 送出主動作走 soft-gold 而非 default 金漸層 |
| 刪除確認框「取消」 | `<Button>` | soft-gold | default | X (size=16) | morandi-gold | ✅ |
| 刪除確認框「刪除」 | `<Button>` + className `bg-morandi-red hover:bg-morandi-red/90 text-white` | default(被 className 蓋) | default | Trash2 (size=16) | 🔴 morandi-red 美術色當危險色（非 status-danger / destructive variant） |

備註：列表操作按鈕集中在 `TourActionButtons.tsx`，**全部手刻 `<Button variant="ghost">` + 套 `ACTION_BUTTON_BASE`/`ACTION_BUTTON_DEFAULT_TONE` 常數**，刻意不走 `<ActionCell>`（因為按鈕需狀態感知、多語意色 morandi-gold）。視覺骨架對齊黃金標準，但「不經 ActionCell」這點與其他列表頁不一致。

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 頁首搜尋框 | ResponsiveHeader 內建 search | text | 走 header 內建 token | ✅ |
| 建團表單「備註」 | `<Input>` | text | 共用 Input token | ✅ |
| 建團表單其他欄位 | tour-form 子組件（TourBasicInfo / TourSettings / TourOrderSection） | 多種 | 共用組件 | ✅（未逐欄展開、走共用 Input/Combobox） |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 頁首「新增專案」選單 | `<DropdownMenu>`（shadcn） | DropdownMenuContent align="end"，item 帶 lucide icon（Calendar / FileText / Copy，`mr-2 h-4 w-4`） | ✅ |
| 建團表單國家 / 城市等 | tour-form 子組件內 Combobox | 共用 | ✅（未逐項展開） |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 建團表單（特殊團 isSpecial 等） | tour-form 子組件內處理 | 待確認（未逐欄展開） |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| `<EnhancedTable>` | 共用 | 共用、`bordered` | `striped` | 桌面走 EnhancedTable 內建；手機卡片自刻空狀態（MapPin 48 + 文字） | ✅ |
| 手機卡片 `<TourMobileCard>` | 卡片 | — | — | 自刻 empty（MapPin size=48 + morandi-secondary 文字） | ✅ |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 建團 / 提案 / 模板表單 | `TourFormShell`（`<Dialog>` + `DialogContent level`） | 1（可傳入） | soft-gold 取消 + soft-gold 送出 | 🟡 送出非 default 金漸層 |
| 編輯團 | `TourEditDialog` | — | （另檔、未展開） | 待確認 |
| 提案/模板轉正式 | `ConvertToTourDialog` | — | （另檔、未展開） | 待確認 |
| 刪除確認 | `DeleteConfirmDialog`（`FormDialog`） | FormDialog | soft-gold 取消 + bg-morandi-red 刪除 | 🔴 刪除鈕 morandi-red |
| 封存原因 | `ArchiveReasonDialog` | — | （另檔、未展開） | 待確認 |
| 連結行程 / 行程選擇 | `LinkItineraryToTourDialog` / `TourItineraryDialog` | — | （另檔） | 待確認 |
| 報名（新增訂單） | `<Dialog>` + `DialogContent level={1}` 包 `AddOrderForm`（orders 模組） | 1 | AddOrderForm 自帶 | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 列表「狀態」欄 | `<StatusBadge type="tour" status=...>` | rounded-full soft pill | tone map（success=morandi-green/15、danger=morandi-red/15、info=status-info/15…） | 🟡 StatusBadge 內部 success/danger tone 仍用 morandi-green / morandi-red 美術色（非 status-success/danger token，全站共用組件層問題） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 編輯 | Edit2 | `size="0.95em"` | morandi-secondary |
| 刪除 | Trash2 | 列表 `size="0.95em"` / 對話框 `size={16}` / `size={20}` | status-danger / morandi-red |
| 封存 / 還原 | Archive / ArchiveRestore | `size="0.95em"` | morandi-secondary |
| 報名 | UserPlus | `size="0.95em"` | morandi-gold |
| 開團 | Send | `size="0.95em"` | morandi-gold |
| 複製 | Copy | `size="0.95em"` / dropdown `h-4 w-4` | morandi-gold |
| 新增（頁首） | Plus | （Button 內建 size-4） | morandi-gold |
| 頁首 tab / 標題 | Calendar / PackageCheck / FileCheck / FileText / Copy / MapPin | `h-4 w-4` / 內建 | morandi |
| 取消（表單/刪除框） | X | `size={16}` | morandi |
| 警示（刪除框標題） | AlertCircle | `size={20}` | morandi-red |
| 手機空狀態 | MapPin | `size={48}` | morandi-secondary/30 |

🔴 **圖示尺寸寫法混用**：列表按鈕走 `size="0.95em"`、對話框與 dropdown 走 `size={16}` / `size={20}` / `h-4 w-4` 三種寫法並存。

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 頁首 tab 列 | ResponsiveHeader 內建 tabs | 內建 | 內建 | ✅ |
| 手機卡片 | `TourMobileCard` | （未展開） | （未展開） | 待確認 |
| 刪除框影響說明區塊 | 自刻 div `bg-morandi-red/5 border-morandi-red/20 rounded-lg` | rounded-lg | 無 | 🔴 morandi-red 美術色當危險底色 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 操作成功 / 失敗 | `toast`（sonner） | ✅ |
| 硬 gate 警示（無出帳銀行不能開團） | `alert()`（`@/lib/ui/alert-dialog`） | ✅ |
| 表單錯誤 | `<Alert variant="danger">` | ✅ |
| 列表載入 | EnhancedTable loading / 手機 `<Spinner size="lg" className="text-morandi-gold">` | ✅ |
| 列表空狀態 | 手機卡片自刻 / 桌面 EnhancedTable 內建 | ✅ |
| 防連點 | 刪除 `isDeleting` state + `disabled={loading}`；FormDialog 傳 `loading` | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **刪除確認框「刪除」按鈕用 `bg-morandi-red hover:bg-morandi-red/90 text-white` 美術色**，而非 `status-danger` token 或 `destructive` variant（DeleteConfirmDialog.tsx:33）。刪除框內影響說明區塊也用 `bg-morandi-red/5 border-morandi-red/20`。
- 🟡 **列表操作按鈕全部手刻 `<Button variant="ghost">` + 套 ACTION_BUTTON_BASE 常數、不走 `<ActionCell>`**（TourActionButtons.tsx）。雖視覺對齊黃金標準，但「不經 ActionCell」與其他列表頁不一致（這是刻意設計：狀態感知 + 多語意色 gold）。
- 🟡 **建團表單送出主動作用 `variant="soft-gold"` 而非 default 金漸層**（TourFormShell.tsx:206），主 CTA 視覺被弱化。
- 🔴 **圖示尺寸寫法三軌並存**：列表 `size="0.95em"`、對話框 `size={16}/{20}`、dropdown/標題 `h-4 w-4`。
- 🟡 **StatusBadge tone 內部仍用 morandi-green/morandi-red 美術色**表 success/danger（status-badge.tsx:29-30），非 status-success/danger token——全站共用組件層問題、影響所有用 StatusBadge 的頁面。

## 備註
- 列表行操作按鈕走 `TourActionButtons.tsx` 的 `useTourActionButtons` hook、按 `tour.status`（template / proposal / active）動態組合按鈕，「結案」不在列表、在詳情頁觸發。
- 報名對話框直接嵌 orders 模組的 `AddOrderForm`，跨模組複用。
- 未逐欄展開的子組件（tour-form / TourEditDialog / ConvertToTourDialog / ArchiveReasonDialog / TourMobileCard）標「待確認」，需要時可再深掃。
