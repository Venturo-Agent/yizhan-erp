# UI 盤點：`/app/more`（行動版「更多」選單）

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/app/more/page.tsx`（樣式全在 `src/app/app/globals.css`）
> 頁面類型：設定 / 選單列表

## ⚠️ 重大前提：行動版是「完全分岔」的獨立設計系統
`/app/**` 不吃桌面版 token、不用 `<Button>`/`<ActionCell>`、全手刻 `.app-menu-*` className + `--app-*` dark theme、主色藍 `#3B82F6`。
本檔「對齊標準?」一律 🔴、根因是整層分岔。

## 一句話用途
行動版的「更多」選單頁、列出個人資料 / 通知設定 / 隱私安全 / 幫助中心 + 登出。

## Layout 骨架
- **頁面框架**：自刻 `<header.app-page-header>` + `<div.app-menu-section>`
- **頁首**：固定頂部、只有標題「更多」（無返回鍵、因為是底部 tab 一級頁）
- **分頁**：無
- **底部導航**：layout 注入 `AppTabBar`（此頁對應「更多」tab）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 選單項（×4：個人資料/通知設定/隱私安全/幫助中心） | 手刻 `<button.app-menu-item>` | — | 自訂 padding 16 | User/Bell/Shield/HelpCircle (20, strokeWidth 1.75) | `--app-text` / icon `--app-text-secondary` | 🔴 手刻 |
| 登出 | 手刻 `<button.app-menu-item.app-menu-danger>` | — | 自訂 | LogOut (20, strokeWidth 1.75) | 🔴 硬編碼 `#ef4444` 紅（`.app-menu-danger`） | 🔴 手刻、硬編碼紅、非 status-danger token |

### ⌨️ 輸入框 Input / Textarea
| （無） | — | — | — | — |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| （無） | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| （無） | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 選單列表（`.app-menu-group`、按鈕堆疊） | gap 2px / padding 16 | 無表頭 | 無 | 無 | 🔴 自刻選單列、非 EnhancedTable |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| （無、登出直接執行不彈確認框） | — | — | — | 🔴 登出無確認 dialog |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| （無） | — | — | — | — |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 個人資料 | User | `size={20} strokeWidth={1.75}` | `--app-text-secondary` |
| 通知設定 | Bell | `size={20} strokeWidth={1.75}` | `--app-text-secondary` |
| 隱私與安全 | Shield | `size={20} strokeWidth={1.75}` | `--app-text-secondary` |
| 幫助中心 | HelpCircle | `size={20} strokeWidth={1.75}` | `--app-text-secondary` |
| 選單項右箭頭 | ChevronRight | `size={18}` | `--app-text-muted` |
| 登出 | LogOut | `size={20} strokeWidth={1.75}` | 硬編碼 `#ef4444` |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 選單項卡片 | 手刻 `.app-menu-item` | hardcode 14px | 無 | 🔴 手刻 |
| 選單圖示底框 | 手刻 `.app-menu-icon` | hardcode 10px | 無 | 🔴 手刻 |
| 分隔線 | 手刻 `.app-menu-divider`（1px `--app-border`） | — | — | 🔴 手刻 divider |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 登出（無 toast / 無確認） | 直接 `await logout()` → `router.push('/app')` | 🔴 無回饋、無防連點 disabled |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **整頁分岔**：藍主色、手刻 `.app-menu-*`、不吃桌面版 token
- 登出色硬編碼 **`#ef4444`**（`.app-menu-danger`）、非 `status-danger` token
- 登出 **無確認 dialog、無 loading disabled**（違反「儲存/刪除/確認鈕必 disabled={loading} 防連點」紀律、雖然登出風險低但仍無防連點）
- 選單 href 多處重複指向 `/app/settings`（通知設定 / 隱私安全 / 幫助中心 三項全導同一個 placeholder、實際上是「點哪個都進同一頁」）
- 「個人資料」導向桌面版 `/hr`（跳出行動版）、跟「網頁版」入口邏輯一樣是跳桌面、但沒明示給使用者

## 備註
- 選單資料是 hardcode 陣列、無 capability gate（譬如「隱私與安全」不該每個員工都看得到 HR 設定、但這裡沒守門、只是 placeholder 暫不影響）。
- 登出走 `useAuthStore().logout`、跟桌面版同 store。
</content>
