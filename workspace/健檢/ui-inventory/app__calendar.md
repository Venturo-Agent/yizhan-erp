# UI 盤點：`/app/calendar`（行動版行事曆 — Coming Soon placeholder）

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/app/calendar/page.tsx`（樣式全在 `src/app/app/globals.css`）
> 頁面類型：placeholder（即將推出）

## ⚠️ 重大前提：行動版分岔 + 本頁是半成品
1. `/app/**` 不吃桌面版 token、不用 `<Button>`/`<ActionCell>`、全手刻 `.app-*` + `--app-*` dark theme、主色藍 `#3B82F6`。
2. **本頁是 WIP placeholder**：只有頁首 + 一個「即將推出」空狀態 + 導向網頁版按鈕、無實際行事曆。

## 一句話用途
（規劃中）讓員工在手機上查看 / 新增行程；目前僅顯示「即將推出」並引導到網頁版 `/calendar`。

## Layout 骨架
- **頁面框架**：自刻 `<header.app-page-header>` + `<div.app-placeholder>`
- **頁首**：固定頂部、左側返回箭頭 + 標題「行事曆」、右側「+」新增按鈕（佔位、無 onClick）
- **分頁**：無
- **底部導航**：layout 注入 `AppTabBar`

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首返回 | 手刻 `<button.app-back-btn>` | — | 40×40 | ArrowLeft (20) | `--app-text-secondary` | 🔴 手刻 |
| 頁首新增 | 手刻 `<button.app-page-btn>` | — | 40×40 | Plus (20) | `--app-text-secondary` | 🔴 手刻、無 onClick(佔位) |
| 前往網頁版 | 手刻 `<button.app-placeholder-btn>` | — | padding 14×24 | 無 | `--app-accent`(藍) 底白字 | 🔴 手刻、藍色 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| （無） | — | — | — | — |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| （無） | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| （無） | — | — |

### 📋 表格 / 列表 Table / List
| （無） | — | — | — | — | — |

### 🪟 對話框 Dialog / Drawer / Popover
| （無） | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| （無） | — | — | — | — |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 返回 | ArrowLeft | `size={20}` | `--app-text-secondary` |
| 頁首新增 | Plus | `size={20}` | `--app-text-secondary` |
| 空狀態大圖示 | Plus | `size={32}` | `--app-text-muted` |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 空狀態圖示框 | 手刻 `.app-placeholder-icon` | hardcode 20px | 無 | 🔴 手刻 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 「即將推出」空狀態 | 手刻 `.app-placeholder`（圖示 + h2 + p + 按鈕） | 🔴 自刻、非共用 EmptyState |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **整頁分岔 + WIP**：藍主色、手刻 `.app-*`、不吃桌面版 token
- 頁首「+」新增按鈕 **無 onClick**（純佔位）
- 空狀態大圖示用 `Plus`（不太語意化、行事曆空狀態用「+」有點怪、應該是 CalendarDays 之類）
- 整頁無真實功能、是 placeholder

## 備註
- 「前往網頁版」導向 `/calendar`（桌面版行事曆）。
- 跟 `/app/orders` placeholder 結構幾乎一模一樣（同一套 `.app-placeholder` 模板、只換圖示 / 文字 / 導向路徑）。
</content>
