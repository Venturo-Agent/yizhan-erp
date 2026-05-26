# UI 盤點：`/app/dashboard`（行動版首頁 / 儀表板）

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/app/dashboard/page.tsx`（樣式全在 `src/app/app/globals.css`）
> 頁面類型：儀表板

## ⚠️ 重大前提：行動版是「完全分岔」的獨立設計系統
同 `app.md`：`/app/**` 不吃桌面版 token、不用 `<Button>`/`<ActionCell>`、全手刻 `.dash-*` className + `--app-*` dark theme 變數、主色藍 `#3B82F6`。
本檔「對齊標準?」一律 🔴、根因是整層分岔。

## 一句話用途
員工登入後第一個畫面、顯示問候語 + 快捷功能卡（我的訂單 / 行事曆）+ 工具按鈕（設定 / 網頁版）。

## Layout 骨架
- **頁面框架**：自刻 `<header.dash-header>` + `<div.dash-body>`（非 ContentPageLayout）
- **頁首**：固定頂部 `.dash-header`，左側問候語 + 使用者名稱，右側鈴鐺通知按鈕（帶紅點 badge）
- **分頁**：無
- **底部導航**：layout 注入 `AppTabBar`（首頁 / 訂單 / 行事曆 / 更多 四個 tab）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首通知鈴鐺 | 手刻 `<button.dash-icon-btn>` | — | 40×40 | Bell (20) | `--app-text-secondary` | 🔴 手刻、無 onClick(佔位) |
| 快捷功能卡（×2） | 手刻 `<button.dash-card>` | — | 自訂 padding 16 | FileText/Calendar (22, strokeWidth 1.75) | `--app-accent` 圖示 / `--app-accent-dim` 底 | 🔴 手刻、藍色系 |
| 工具按鈕（×2） | 手刻 `<button.dash-tool-btn>` | — | 自訂 padding 14 | Settings/Monitor (18, strokeWidth 1.75) | `--app-text-secondary` | 🔴 手刻 |

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
| 快捷功能列表（`.dash-grid`、卡片堆疊非真 table） | gap 2px | 區塊標題 `.dash-section-title`（小寫灰標） | 無 | 無 | 🔴 自刻卡片列、非 EnhancedTable |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| （無） | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 通知未讀紅點 | 手刻 `span.dash-badge` | 圓點 8×8 | `--app-accent`(藍 #3B82F6) | 🔴 未讀點用藍、桌面版規範未讀走 `status-danger`(紅) |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 通知 | Bell | `size={20}` | `--app-text-secondary` |
| 我的訂單 | FileText | `size={22} strokeWidth={1.75}` | `--app-accent` |
| 行事曆 | Calendar | `size={22} strokeWidth={1.75}` | `--app-accent` |
| 卡片右箭頭 | ChevronRight | `size={18}` | `--app-text-muted` |
| 設定 | Settings | `size={18} strokeWidth={1.75}` | `--app-text-secondary` |
| 網頁版 | Monitor | `size={18} strokeWidth={1.75}` | `--app-text-secondary` |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 快捷功能卡 | 手刻 `.dash-card` | hardcode 14px | 無 | 🔴 手刻 |
| 卡片圖示底框 | 手刻 `.dash-card-icon` | hardcode 12px | 無 | 🔴 手刻、藍底 |
| 工具按鈕容器 | 手刻 `.dash-tool-btn` | hardcode 14px | 無 | 🔴 手刻 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| （無 loading / skeleton、資料全靜態 hardcode） | — | — |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **整頁分岔**：`--app-*` dark theme、藍主色、全手刻 `.dash-*`、不吃桌面版 token
- 未讀紅點用 **藍 `--app-accent`**、跟桌面版「未讀走 status-danger 紅」規範相反
- 通知鈴鐺按鈕 **無 onClick**（純佔位、按了沒反應）
- 快捷功能、工具的資料是 hardcode 陣列（非從權限 / API 動態產生）、無 capability gate
- import 了 `LogOut` 但未使用（dead import、ESLint 可能 warn）
- 無載入態 / 無空狀態 / 無真實資料（純導航卡）

## 備註
- 「網頁版」工具導向 `/dashboard`（跳回桌面版）、是行動↔桌面切換入口。
- 問候語依 `new Date().getHours()` 算早安/午安/晚安、client 端時區。
- 此頁是行動版唯一有「真內容」的頁（其餘 orders/calendar/settings 都是 Coming Soon placeholder）。
</content>
