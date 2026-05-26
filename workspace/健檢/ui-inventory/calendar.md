# UI 盤點：`/calendar`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/calendar/page.tsx` → `_components/`（CalendarGrid[FullCalendar] / CalendarStyles / AddEventDialog / EditEventDialog / EventDetailDialog / MoreEventsDialog / BirthdayListDialog / calendar-settings-dialog）
> 頁面類型：`行事曆`（FullCalendar 月/週/日視圖 + 事件 CRUD 對話框）

## 一句話用途
讓員工以月/週/日視圖檢視個人/公司行事曆事項（含旅遊團出團、生日），並新增、編輯、刪除、拖曳事件。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（標題「行事曆」）
- **頁首**：`headerActions` escape hatch 放一排自刻控制（上/今天/下月切換 + 月/週/日視圖切換 + 生日名單 + 設定）；`primaryAction`（新增事項 Plus，✅ 結構化）
- **主體**：`<div bg-card rounded-lg border shadow-sm>` 包 `CalendarGrid`（FullCalendar，dynamic ssr:false，載入 spinner 自刻 `animate-spin border-morandi-gold`）
- **分頁**：N/A（行事曆視圖、無列表分頁）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「新增事項」 | ContentPageLayout `primaryAction` | default 內建 | — | Plus | 金漸層 | ✅ |
| 頁首「上月」← | `<Button variant="ghost">` + className `h-9 w-9 hover:text-morandi-gold` | ghost | h-9 w-9 | 文字「←」 | morandi-gold hover | 🟡 用文字箭頭非 lucide ChevronLeft；包在自刻 bg-card 群組 |
| 頁首「月份/今天」 | 🔴 手刻 `<button>` | — | min-w-120 | 無 | morandi-primary hover gold | 🟡 手刻 button（非 Button 組件） |
| 頁首「下月」→ | `<Button variant="ghost">` | ghost | h-9 w-9 | 文字「→」 | morandi-gold | 🟡 文字箭頭 |
| 頁首「月視圖」 | `<Button variant="ghost">` + active `bg-morandi-gold/10 text-morandi-gold` | ghost | h-9 px-3 | Calendar (size=16) | morandi-gold | 🟡 active 態自刻、群組在自刻 bg-card 容器 |
| 頁首「週視圖」 | `<Button variant="ghost">` | ghost | h-9 px-3 | CalendarDays (16) | morandi-gold | 🟡 同上 |
| 頁首「日視圖」 | `<Button variant="ghost">` | ghost | h-9 px-3 | CalendarClock (16) | morandi-gold | 🟡 同上 |
| 頁首「生日」 | `<Button variant="soft-gold">` + 大量 className 覆寫（bg-card border shadow hover...） | soft-gold | h-9 px-3 | Cake (16) | morandi-secondary→gold | 🟡 soft-gold 被 className 大幅覆寫成自訂外觀 |
| 設定 | `CalendarSettingsDialog`（自帶 trigger） | （另檔） | — | — | — | 待確認 |
| 新增事項對話框「取消」 | `<Button variant="outline">` | outline | default | X (`h-4 w-4`) | 走 variant | ✅ |
| 新增事項對話框「新增」 | `<Button variant="soft-gold">` | soft-gold | default | 無 | morandi-gold | 🟡 主動作 soft-gold 非 default 金漸層 |
| 事件詳情「刪除」 | `<Button variant="soft-gold">` + className `text-morandi-red hover:bg-morandi-red hover:text-white` | soft-gold | default | Trash2 (16) | 🔴 morandi-red（非 status-danger / destructive variant） |
| 事件詳情「編輯」 | `<Button variant="soft-gold">` + className `text-morandi-gold hover:bg-morandi-gold hover:text-white` | soft-gold | default | 無 | morandi-gold | 🟡 |
| 事件詳情「關閉」 | `<Button variant="soft-gold">` | soft-gold | default | X (16) | morandi-gold | 🟡 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 新增事項「標題」 | 🔴 原生 `<input>` + 自刻 `inputClassName` | text | `border-morandi-container bg-card`，focus ring 🔴 hardcode `#B8A99A` | 🟡 原生 input（非共用 Input）+ focus 色 hardcode hex |
| 新增事項「開始時間」 | 🔴 原生 `<input>` + inputClassName（含全形轉半形 / 時間範圍解析邏輯） | text | 同上 | 🟡 原生 input |
| 新增事項「說明」 | 🔴 原生 `<textarea>` + inputClassName | textarea | 同上 | 🟡 原生 textarea |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 新增事項「日期 / 結束日期」 | `<DatePicker>`（共用組件） | 共用 | ✅ |
| 新增事項「事件類型」 | `<Select>`（shadcn，SelectTrigger 套 inputClassName） | 共用組件 + 自刻 className | 🟡 Select 組件對、但 trigger 硬塞 inputClassName 覆寫樣式 |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 設定對話框（可能含篩選開關） | calendar-settings-dialog | 待確認 |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 無傳統表格 | FullCalendar 格線（CalendarStyles 全 CSS var） | — | — | — | N/A |
| 生日名單 / 更多事件 | BirthdayListDialog / MoreEventsDialog 內列表 | — | — | — | 待確認 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增事項 | `FormDialog`（maxWidth 2xl，customFooter） | 預設 | outline 取消 + soft-gold 新增 | ✅（註解標明 5/16 遷移 FormDialog SSOT） |
| 編輯事項 | `EditEventDialog` | （另檔） | — | 待確認 |
| 事件詳情 | `EventDetailDialog`（自刻 footer） | （另檔） | soft-gold 刪/編/關 | 🟡 刪除 morandi-red |
| 更多事件 | `MoreEventsDialog` | （另檔） | — | 待確認 |
| 生日名單 | `BirthdayListDialog` | （另檔） | — | 待確認 |
| 設定 | `CalendarSettingsDialog` | （另檔） | — | 待確認 |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 行事曆事件色塊（依 type 著色） | FullCalendar event + CalendarStyles CSS（`data-event-type`） | 左邊框 + 半透明底 | tour=`--status-info`、deadline=`--morandi-red`、holiday=`--morandi-green`、task=`--morandi-gold`、meeting=`--morandi-muted` | 🟡 走 CSS var（部分 status token、部分 morandi 美術色當語意色） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 新增 | Plus | primaryAction 內建 | morandi-gold |
| 月/週/日視圖 | Calendar / CalendarDays / CalendarClock | `size={16}` | morandi-gold |
| 生日 | Cake | `size={16}` | morandi-secondary/gold |
| 上/下月 | 🔴 純文字「←」「→」 | — | morandi-gold |
| 刪除 | Trash2 | `size={16}` | morandi-red |
| 取消/關閉 | X | `h-4 w-4` / `size={16}` | 繼承 |
| 詳情時間 | CalendarIcon / Clock | （詳情內） | morandi |

🔴 **上/下月用純文字箭頭、不用 lucide ChevronLeft/Right**；圖示尺寸 `size={16}` / `h-4 w-4` 混用。

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 頁首控制群組（月切換 / 視圖） | 自刻 `<div bg-card border rounded-lg shadow-sm>` | rounded-lg | shadow-sm | ✅ 走 token |
| 日曆主體容器 | 自刻 `<div bg-card rounded-lg border shadow-sm>` | rounded-lg | shadow-sm | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 刪除確認 | `confirm({ type:'danger' })`（`@/lib/ui/alert-dialog`） | ✅ |
| CalendarGrid 載入 | 自刻 `animate-spin rounded-full border-morandi-gold` | 🟡 自刻 spinner（非共用 Spinner） |
| 防連點 | EditEventDialog 傳 `loading={isUpdatingEvent}`；AddEventDialog `loading={false}` 寫死 | 🟡 新增對話框 loading 寫死 false（無提交中防連點） |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🔴 **AddEventDialog 表單全用原生 `<input>`/`<textarea>` + 自刻 `inputClassName`**，focus ring 用 hardcode hex `#B8A99A`（非 token）。與其他頁共用 Input 組件不一致。
- 🔴 **事件詳情「刪除」按鈕用 `text-morandi-red hover:bg-morandi-red`**（美術色），非 status-danger / destructive variant。
- 🟡 **上/下月切換用純文字箭頭「←」「→」**，不走 lucide icon。
- 🟡 **頁首視圖切換、生日按鈕大量 className 覆寫 Button variant**（soft-gold/ghost 被自訂 bg-card/border/shadow 蓋掉），形成「半自刻」按鈕群組。
- 🟡 **CalendarGrid 載入用自刻 `animate-spin` div**，非共用 `<Spinner>`。
- 🟡 **AddEventDialog `loading={false}` 寫死**，新增提交無防連點（其他對話框有傳 loading）。
- 🟢 **加分**：CalendarStyles 事件色 + 格線全走 CSS var（`--status-info` / `--morandi-*` / `--cal-*`），FullCalendar 主題對齊度高；新增對話框已遷移 FormDialog SSOT（有註解）。

## 備註
- 此頁主體是 FullCalendar（第三方），CalendarStyles 用 `style jsx global` 把 FC 內部 class 全改吃 morandi CSS var、對齊度比想像中高。
- 事件類型色（tour/deadline/holiday/task/meeting）混用 status token（status-info）與 morandi 美術色（morandi-red/green/gold）當語意色——與全站「美術色 vs status token」議題一致。
- 未逐項展開：EditEventDialog、MoreEventsDialog、BirthdayListDialog、calendar-settings-dialog — 標「待確認」。
