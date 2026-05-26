# UI 盤點：`/app`（行動版登入頁）

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/app/page.tsx`（樣式全在 `src/app/app/globals.css`、layout `src/app/app/layout.tsx`）
> 頁面類型：公開頁（登入）

## ⚠️ 重大前提：行動版是「完全分岔」的獨立設計系統
`/app/**` 整套 **不吃桌面版 design token**（morandi-* / status-* / tokens.css）、也 **不用 `<Button>` / `<ActionCell>` / shadcn 任何共用組件**。
它自帶一套 dark theme CSS 變數（`src/app/app/globals.css` 的 `--app-*`）+ 全手刻 className（`.login-*` / `.dash-*` / `.app-*`）。
配色主軸是 **藍色 `#3B82F6`（--app-accent）+ 深色底 `#0d0f14`**、跟桌面版的「莫蘭迪金 + 淺色卡片」完全是兩個世界。
→ 本檔所有「對齊標準?」一律 🔴（除非該元素剛好沒顏色）、根因是**整層分岔、不是個別寫錯**。

## 一句話用途
員工在手機上輸入「組織代碼 + Email + 密碼」登入行動版 ERP。

## Layout 骨架
- **頁面框架**：自刻 `div.app-login-container > div.login-card`（非 ListPageLayout / ContentPageLayout）
- **頁首**：卡片內自刻 logo 區（`.login-logo`、VENTURO 標題 + 副標）、無麵包屑、無頁首動作按鈕
- **分頁**：無
- **登入頁特例**：layout 的 `AppTabBar` 在 `/app` 路徑會 return null（不顯示底部 tab）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 密碼顯示切換 | 手刻 `<button.login-toggle>` | — | 自訂 | Eye / EyeOff (18) | `--app-text-muted` | 🔴 手刻、非 Button |
| 登入提交 | 手刻 `<button.login-btn>` | — | 自訂 padding 16px | 無（loading 時自刻 dot 動畫） | `--app-accent`(#3B82F6) 藍底白字 | 🔴 手刻、藍色非 morandi-gold |
| 忘記密碼 | 手刻 `<button.login-footer-link>` | — | 自訂 | 無 | `--app-text-muted` | 🔴 手刻、純文字按鈕 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 組織代碼 | 原生 `<input.login-input>` | text（自動 upper） | `--app-bg` 底 / `--app-border` 邊 / focus `--app-accent` | 🔴 原生 input、非共用 Input、藍 focus |
| Email | 原生 `<input.login-input>` | email | 同上 | 🔴 同上 |
| 密碼 | 原生 `<input.login-input>`（包 `.login-input-wrap`） | password/text | 同上 | 🔴 同上 |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （無） | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 記住組織代碼 | 原生 `<input type=checkbox .login-checkbox>`（`accent-color: --app-accent`） | 🔴 原生 checkbox、藍 accent、非共用 Checkbox |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| （無） | — | — | — | — | — |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| （無） | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| （無、僅錯誤橫幅見下） | — | — | — | — |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 錯誤提示 | AlertCircle | `size={16}` + inline `style={{color:'#ef4444'}}` | 🔴 硬編碼 #ef4444 |
| 密碼顯示 | Eye | `size={18}` | `--app-text-muted` |
| 密碼隱藏 | EyeOff | `size={18}` | `--app-text-muted` |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 登入卡片 | 手刻 `div.login-card` | hardcode `24px` | 無 | 🔴 手刻、圓角硬編碼 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 錯誤橫幅 | 手刻 `div.login-error`（紅底 rgba(239,68,68,...)） | 🔴 硬編碼紅、非 status-danger token |
| 登入中載入 | 手刻 `.login-loading` + 兩個彈跳 dot（`@keyframes loading-bounce`） | 🔴 自刻動畫、非共用 Skeleton/Spinner |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **整頁分岔**：完全不用桌面版 design token、改用 `--app-*` dark theme 變數（globals.css）
- 主色用 **藍 `#3B82F6`**、不是公司 CIS 主色 `morandi-gold`（直接違反 UI 紀律紅線）
- 錯誤色硬編碼 `#ef4444`（兩處：AlertCircle inline style + `.login-error` rgba）、非 `status-danger`
- 所有按鈕手刻 `<button class>`、沒走 `<Button>`
- 所有 input 原生、圓角 hardcode（12px / 24px）
- 字型用 Google Fonts `Noto Sans TC`（globals.css `@import`）、不是桌面版思源宋體 + 蘋方

## 備註
- 登入走 `useAuthStore().validateLogin`、跟桌面版同一 auth store（邏輯共用、UI 分岔）。
- 「忘記密碼」按鈕無 onClick（純佔位、按了沒反應）。
- 登入成功導向 `/app/change-password`（首登）或上次路徑 / `/app/dashboard`；`/app/change-password` page 不在本批 6 頁、需另查是否存在。
</content>
</invoke>
