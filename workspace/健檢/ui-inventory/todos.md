# UI 盤點：`/todos`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/todos/page.tsx` → `_components/`（TodoFiltersBar / KanbanColumn / TodoCard / AddColumnInput / AddTodoForm / TodoExpandedView / PnrToolDialog）
> 頁面類型：`看板 Kanban`（拖曳式待辦看板、欄位 + 卡片 CRUD）

## 一句話用途
讓員工以看板（Trello 式）管理待辦：自訂欄位、拖曳卡片改狀態、依優先級/負責人篩選、新增/編輯/刪除任務與欄位。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（標題「待辦事項」，`-m-4 lg:-m-6` 滿版）
- **頁首**：搜尋框 + `headerActions`（TodoFiltersBar：優先級 Select + 負責人 Select + 清除篩選）+ `primaryAction`（新增任務 Plus，✅ 結構化）
- **主體**：`DragDropContext`（@hello-pangea/dnd）水平捲動看板，多個 `KanbanColumn` + 末尾 `AddColumnInput`
- **分頁**：N/A（看板、client-side 篩選）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增任務」 | ContentPageLayout `primaryAction` | default 內建 | — | Plus | 金漸層 | ✅ |
| 篩選「清除篩選」 | `<Button variant="ghost">` | ghost | sm h-9 | 無 | morandi-secondary | ✅ |
| 欄位「快速新增卡片」(＋) | 🔴 手刻 `<button>` | — | p-1 | Plus (size=16) | morandi-secondary→primary | 🟡 手刻 button |
| 欄位「重新命名」 | 🔴 手刻 `<button>` | — | p-1 | Pencil (size=13) | morandi-secondary→primary | 🔴 編輯用 Pencil（非全站主流 Edit2）+ 手刻 button |
| 欄位「刪除」 | 🔴 手刻 `<button>` | — | p-1 | Trash2 (size=13) | morandi-secondary→morandi-red | 🟡 手刻 button、morandi-red hover |
| 快速新增卡片 確認/取消 | `<Button variant="soft-gold">` / `<Button variant="ghost">` | soft-gold / ghost | sm | — | morandi-gold | 🟡 |
| 新增欄位 確認/取消 | `<Button variant="soft-gold">` / `<Button variant="ghost">` | soft-gold / ghost | sm h-7 | — | morandi-gold | 🟡 |
| 「新增欄位」入口 | 🔴 手刻 `<button>`（虛線框 `border-2 border-dashed`） | — | py-3 | Plus (size=16) | morandi-secondary | 🟡 手刻 button（看板慣例的 ghost 加欄位） |
| 新增任務表單 提交/取消 | `<Button variant="soft-gold">` ×2 | soft-gold | default | Plus (16) / X | morandi-gold | 🟡 主動作 soft-gold；取消也 soft-gold（兩鈕同 variant、無視覺主次） |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 快速新增卡片 輸入 | KanbanColumn 內 input | text | 待確認（未逐行展開） | 待確認 |
| 新增欄位 名稱 | AddColumnInput 內 input | text | 待確認 | 待確認 |
| 新增任務 標題/說明等 | AddTodoForm（label 走 morandi-primary） | text | 共用 | 待確認（欄位細節未全展開） |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 篩選「優先級」 | `<Select>`（shadcn，h-9 w-120 text-xs，option 用 ★ 星級） | 共用 | ✅ |
| 篩選「負責人」 | `<Select>` | 共用 | ✅ |
| 新增任務 優先級/負責人 | AddTodoForm 內 Select | 共用 | 🔴 優先級選項用原生 dot `bg-red-500/orange-500/amber-500/slate-400/300`（見下） |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 卡片完成切換 | onToggleComplete（卡片互動、handler 在 hook） | 待確認 |
| 子任務勾選 | TodoExpandedView 內 | 待確認 |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 無表格 | 看板欄位（KanbanColumn）+ 卡片（TodoCard） | — | — | 欄位空時 KanbanColumn 自刻「`text-morandi-muted/60` 文字」 | N/A（看板形態） |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增任務 | `<Dialog>` `DialogContent level={1} max-w-md` 包 AddTodoForm | 1 | AddTodoForm 自帶（soft-gold ×2） | ✅ level 對 |
| 卡片展開 | `TodoExpandedView`（另檔，全頁/抽屜式） | （另檔） | — | 待確認 |
| 確認（刪除欄位/任務） | `<ConfirmDialog>`（`useConfirmDialog`） | 共用 | 共用 | ✅ |
| PNR 工具 | `PnrToolDialog`（另檔） | （另檔） | — | 待確認 |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 卡片 優先級標籤（dot + 文字） | TodoCard 自刻 `PRIORITY_COLORS` map | dot + text | 🔴 **Tailwind 預設色**：5緊急 `bg-red-50 text-red-600 bg-red-500`、4高 `bg-orange-50/600/500`、3中 `bg-amber-50/600/500`、2低/1很低 `bg-slate-100 text-slate-500/400 bg-slate-400/300` | 🔴🔴 用 Tailwind 預設色 + slate（連 morandi 都不是） |
| 卡片 關聯團 chip | 自刻 `<span text-morandi-gold bg-morandi-gold/8>` | rounded-md | morandi-gold | ✅ |
| 卡片 期限色 | 自刻 span | — | 🔴 逾期 `text-red-600`、今天 `text-amber-600`、將到期 `text-orange-500` | 🔴 Tailwind 預設色當期限語意色 |
| 卡片 負責人頭像 | 自刻 `bg-morandi-gold/20 text-morandi-gold` 圓 | rounded-full | morandi-gold | ✅ |
| 欄位顏色標記 | KanbanColumn `COLUMN_COLORS` map | border + text | gray=morandi-muted / gold=morandi-gold / green=morandi-green / red=morandi-red / blue=`status-info` | 🟡 morandi 美術色 + 1 個 status token 混用 |
| 新增任務 優先級 dot | AddTodoForm 自刻 | dot | 🔴 `bg-red-500 / orange-500 / amber-500 / slate-400 / slate-300` | 🔴 Tailwind 預設色 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 新增（頁首/欄位/卡片/任務） | Plus | `size={16}` / primaryAction 內建 | morandi-gold |
| 重新命名欄位 | 🔴 Pencil | `size={13}` | morandi-secondary |
| 刪除欄位 | Trash2 | `size={13}` | morandi-red |
| 卡片 期限 | Calendar | `size={11}` | 隨期限狀態變色 |
| 卡片 子任務 | Paperclip | `size={11}` | muted |
| 卡片 關聯團 | MapPin | `size={10}` | morandi-gold |
| 取消 | X | （AddTodoForm） | 繼承 |

🔴 **編輯用 Pencil（非全站主流 Edit2）**；圖示尺寸 `size={10}/{11}/{13}/{16}` 多種並存。

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 看板欄位 | 自刻 `bg-morandi-container/40 rounded-xl border shadow-sm` | rounded-xl | shadow-sm | ✅ 走 token |
| 待辦卡片 | 自刻 `rounded-lg border bg-card`，拖曳時 `ring-2 ring-morandi-gold rotate-[1deg]` | rounded-lg | hover:shadow-sm / drag shadow-lg | ✅ 走 token |
| 新增欄位框 | 自刻 `bg-morandi-container/30 rounded-lg` / 虛線框 | rounded-lg | — | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 刪除確認 | `ConfirmDialog` + `useConfirmDialog` | ✅ |
| 看板載入 | 自刻純文字「載入中...」`text-morandi-muted` | 🟡 自刻文字（非 Spinner / Skeleton） |
| 欄位空狀態 | 自刻文字 | 🟡 自刻 |
| 拖曳排序失敗 | logger.error（無 toast） | 🟡 拖曳失敗靜默 log、無 user 回饋 |
| 防連點 | `isSubmitting` / `addingColumnInFlight` state 傳 disabled | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴🔴 **TodoCard `PRIORITY_COLORS` + AddTodoForm 優先級 dot 用 Tailwind 預設色**（`bg-red-50/500`、`bg-orange-50/500`、`bg-amber-50/500`、`bg-slate-100/400/300`、`text-red-600/amber-600/orange-500`）——直接違反 UI 紅線「禁用 Tailwind 預設色」，且 slate 連 morandi 體系都不是。卡片期限色（逾期/今天/將到期）同樣用 `text-red-600/amber-600/orange-500`。
- 🔴 **欄位「重新命名」用 Pencil icon**，非全站主流 `Edit2`。
- 🟡 **欄位操作（＋ / 重命名 / 刪除）手刻 `<button>`**，非 Button 組件 / ActionCell（看板慣例可接受、但與全站 ActionCell 不一致）。
- 🟡 **新增任務表單 提交 + 取消都用 `variant="soft-gold"`**，兩鈕同色、無主次視覺（取消通常該 outline/ghost）。
- 🟡 **看板載入用純文字「載入中...」**，非共用 Spinner / Skeleton。
- 🟡 **拖曳排序失敗只 logger.error、無 toast**，user 不知道排序沒存成功（違反「寫入失敗 client 還原 + toast」）。
- 🟢 **加分**：KanbanColumn / 卡片容器 / 拖曳態全走 morandi token + rounded/shadow token；篩選 Select、ConfirmDialog、防連點 state 都對齊。

## 備註
- 此頁顏色問題集中在「優先級 / 期限」語意色——全用 Tailwind 預設色（red/orange/amber/slate），是 7 頁中與 orders 的 OrderStatusBadge 並列的「Tailwind 預設色」重災區。建議改 status-* token（緊急/逾期→status-danger、高/今天→status-warning、中→status-info、低→morandi-muted）。
- 容器層（欄位/卡片）對齊度其實不錯，問題主要在小色塊（dot / badge / 期限文字）。
- 未逐項展開：TodoExpandedView（卡片展開詳情、子任務、附件）、PnrToolDialog、AddTodoForm 完整欄位、KanbanColumn 快速新增 input — 標「待確認」。
