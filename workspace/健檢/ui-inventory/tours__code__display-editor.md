# UI 盤點：`/tours/[code]/display-editor`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/tours/[code]/display-editor/page.tsx` + `_components/`（EditorToolbar / EditorPanel / DeleteBlockDialog / AiAssistDialog / block-editors/*）
> 頁面類型：`特殊 — 全螢幕視覺編輯器`（行程展示頁 Canvas 編輯器）

## 一句話用途
讓業務全螢幕編輯「對客展示行程」（Canvas）：左主畫面即時渲染、右側結構化 panel 改內容、頂部工具列預覽 / AI 助理 / 發布，編輯 debounce 自動存草稿。

## Layout 骨架
- **頁面框架**：🔴 全自刻 inline-style `<div>`（**刻意**不用 ContentPageLayout，需全螢幕、註解說明原因），`minHeight:100vh` + `background: var(--background)`
- **頁首**：`EditorToolbar`（sticky、深栗底 `#2D1F18`、56px、左返回+團號+標題、中儲存狀態、右 AI/預覽/發布）
- **主體**：左 `<main>` `CanvasRenderer` 即時渲染 + 右 `EditorPanel`（360px sticky 結構化編輯）
- **分頁**：無（單一畫布編輯）
- **權限**：`tours.display-itinerary.write`，無權限顯示 `<UnauthorizedPage>`；載入走 `<ModuleLoading>`

> ⚠️ **此頁是刻意的設計特例**：toolbar / AI 對話框走 Canvas 主題色（深栗 `#2D1F18` / 銅 `#C85A38`），組件註解明說「屬於 Canvas 編輯器、不掛 morandi 主題」。判斷對齊標準時須區分「合理特例」vs「應走 token 卻沒走」。

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| Toolbar「返回」 | 🔴 手刻 `<button>` inline style | — | padding 6/12 | ArrowLeft (size=14) | hardcode 白字 + `rgba(255,255,255,.25)` border | 🟠 Canvas 特例（合理但全 hardcode hex） |
| Toolbar「AI 助理」 | 🔴 手刻 `<button>` inline style | — | padding 7/14 | Sparkles (size=14) | hardcode 銅 `#C85A38` | 🟠 Canvas 特例 |
| Toolbar「預覽」 | 🔴 手刻 `<button>` inline style | — | padding 7/14 | Eye (size=14) | hardcode 白/透明 | 🟠 Canvas 特例 |
| Toolbar「取消發布」 | 🔴 手刻 `<button>` inline style | — | padding 7/14 | 無 | hardcode 白 | 🟠 Canvas 特例 |
| Toolbar「發布 / 重新發布」 | 🔴 手刻 `<button>` inline style | — | padding 7/16 | 無 | hardcode 銅底 `#C85A38` | 🟠 Canvas 特例（主動作色非 morandi-gold） |
| EditorPanel sections/blocks 樹狀清單項 | 🔴 手刻 `<button>` inline style | — | — | — | `var(--morandi-gold-light)`（選取）/ transparent | 🟡 部分走 morandi CSS var、部分 hardcode |
| AiAssistDialog「取消 / 生成 / 套用」 | 🔴 手刻 `<button>` + `btnStyle()` helper inline | — | — | — | hardcode COPPER / hex | 🔴 自刻按鈕 helper、全 hardcode hex |
| AiAssistDialog 關閉 X | 🔴 手刻 `<button>` inline | — | — | X (lucide) | hardcode | 🔴 |
| DeleteBlockDialog footer | ✅ `<Button>` | outline 取消 + destructive 確認 | default | 無 | 走 Button variant | ✅ 唯一走標準 Button 的對話框 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 各 block 編輯表單（CoverEditor / DayHeaderEditor / RouteCardEditor / SpotlightEditor / JpNoteEditor / ReadOnlyBlockEditor） | block-editors/* 內各自 input/textarea | text / textarea | 待確認（block editor 內部未逐一展開） | 待確認 |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| block editor 內可能含 select（layout 等） | block-editors/* | — | 待確認 |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| AiAssistDialog 建議項勾選 | 🔴 原生 `<input type="checkbox">` inline style `accentColor: COPPER` | 🔴 原生 checkbox + hardcode 銅色（非共用 Checkbox） |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| EditorPanel sections/blocks 樹狀清單 | 自刻 button 清單（非 table） | — | — | — | 🟡 自刻樹狀清單 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 刪除 block 確認 | ✅ `<Dialog>`（shadcn DialogContent level=2） | 2 | outline + destructive Button | ✅ |
| AI 行程助理 | 🔴 完全自刻 overlay（`<div>` `background:rgba(0,0,0,.55)` + 自刻面板 `#FDFAF6`） | 自刻 | 自刻 btnStyle 按鈕 | 🔴 不走 Dialog 組件、不設 level、自刻 modal |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| Toolbar 儲存狀態指示（已儲存/未儲存/儲存中/失敗） | 🔴 自刻 SaveIndicator（圓點 + 文字 inline style） | dot + text | hardcode hex（綠 `#A8D5A2` / 黃 `#E8C57A` / 紅 `#E89A8C`） | 🔴 自刻狀態指示 + hardcode hex（非 status token / StatusBadge） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 返回 | ArrowLeft | `size={14}` | hardcode 白 |
| AI 助理 | Sparkles | `size={14}` / 對話框 `size={17}/{28}/{32}` | hardcode COPPER `#C85A38` / `#ccc` |
| 預覽 | Eye | `size={14}` | hardcode 白 |
| 對話框關閉 | X | （lucide 預設） | hardcode |
| 樹狀清單展開 | ChevronRight | — | — |
| 勾選 | Check | — | — |

🔴 **圖示顏色全走 hardcode hex / 白色，不走 token**（Canvas 特例範圍）。

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| Toolbar 容器 | 自刻 div inline | `borderRadius:6`（按鈕） | `boxShadow: 0 2px 8px rgba(0,0,0,.2)` hardcode | 🔴 hardcode 圓角 / 陰影 |
| EditorPanel 容器 | 自刻 div inline `var(--card,#ffffff)` | — | — | 🟡 部分走 CSS var |
| AiAssistDialog 面板 | 自刻 div `#FDFAF6` | hardcode | hardcode | 🔴 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 發布 / 取消發布 / 刪除成功失敗 | `toast`（sonner） | ✅ |
| 頁面載入 | `<ModuleLoading>` | ✅ |
| 無權限 | `<UnauthorizedPage>` | ✅ |
| 載入錯誤 | 自刻 div inline style（`var(--morandi-secondary)` 文字） | 🟡 自刻錯誤畫面 |
| AI 生成中 | 自刻 inline（Sparkles + 文字「AI 正在生成文案⋯」） | 🟠 Canvas 特例 |
| 防連點 | publishLoading / unpublishLoading / deleteLoading state + button disabled | ✅ |
| 自動存草稿狀態 | SaveIndicator（saveStatus） | ✅（互動設計）|

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 🟠 **整頁刻意走 inline style + Canvas 主題色 hardcode hex**（`#2D1F18` 深栗 / `#C85A38` 銅 / `#A8D5A2` 綠 / `#E8C57A` 黃 / `#E89A8C` 紅）。組件註解明說是 Canvas 編輯器專屬主題、不掛 morandi。**屬合理設計特例**，但意味著此頁無法靠改 token 統一、若公司 CIS 要動 Canvas 主題色得逐檔改 hardcode。
- 🔴 **AiAssistDialog 完全自刻 modal**（不走 `<Dialog>` 組件、不設 level、自刻 overlay + `btnStyle()` 按鈕 helper）。與全站 Dialog/FormDialog 體系分岔。
- 🔴 **AI 對話框用原生 `<input type="checkbox">` + `accentColor` hardcode**，非共用 Checkbox 組件。
- 🔴 **SaveIndicator 自刻狀態色（綠/黃/紅 hardcode hex）**，非 StatusBadge / status token。
- ✅ **唯一對齊標準的是 DeleteBlockDialog**（走 shadcn Dialog level=2 + Button outline/destructive variant）——可作為「此頁其他 modal 該長怎樣」的參照。
- 🟡 **Toolbar 發布按鈕主動作用銅色 `#C85A38`**，非 morandi-gold（Canvas 特例）。

## 備註
- 此頁是 7 頁中 UI 最特殊的：幾乎全 inline style、刻意脫離 morandi token 系統，目的是視覺上呼應對客 Canvas 主題、讓業務「一眼知道我在編 Canvas」。
- block 編輯器（CoverEditor / DayHeaderEditor / RouteCardEditor / SpotlightEditor / JpNoteEditor / ReadOnlyBlockEditor）內部的 input/select 細節未逐一展開、標「待確認」。需要時可深掃 `_components/block-editors/`。
- 評估時建議：把此頁的 inline-style/hardcode 標為「**已知特例、待 William 拍板是否要納入 token 體系**」，不與一般業務頁同尺衡量。但 AiAssistDialog 自刻 modal + 原生 checkbox 這類「明明有共用組件卻自刻」的點，仍屬可收斂的不統一。
