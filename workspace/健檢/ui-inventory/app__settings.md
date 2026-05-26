# UI 盤點：`/app/settings`（行動版設定 — Coming Soon placeholder）

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/app/settings/page.tsx`
> 頁面類型：placeholder（即將推出）

## ⚠️ 重大前提：行動版分岔 + 本頁是半成品 + inline style
1. `/app/**` 不吃桌面版 token、不用 `<Button>`/`<ActionCell>`、主色藍 `#3B82F6`。
2. **本頁是 WIP placeholder**（檔頭註解明寫「真實內容上 6/1 之後實作」）。
3. ⚠️ **本頁比其他頁更亂**：空狀態區大量用 **inline `style={{}}`**（hardcode px / color `#666`），連 globals.css 的 `.app-placeholder` class 都沒用、自成一格。

## 一句話用途
（規劃中）通知設定 / 隱私安全 / 幫助中心；目前僅顯示「即將推出」。是 `/app/more` 三個 menu item 的共同落點、補來避免死連結（檔頭註解明載 2026-05-21）。

## Layout 骨架
- **頁面框架**：自刻 `<header.app-page-header>` + 一個 inline-style 的置中 div
- **頁首**：固定頂部、左側返回箭頭 + 標題「設定」
- **分頁**：無
- **底部導航**：layout 注入 `AppTabBar`

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首返回 | 手刻 `<button.app-header-btn>` | — | — | ArrowLeft (20) | — | 🔴 手刻、且 class `.app-header-btn` **在 globals.css 完全無定義（已 grep 確認、全專案只此一處用、其他頁用的是 `.app-back-btn`）→ 此鈕掉樣式、是真 bug** |

### ⌨️ 輸入框 Input / Textarea
| （無） | — | — | — | — |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| （無） | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| （無、通知開關等未實作） | — | — |

### 📋 表格 / 列表 Table / List
| （無） | — | — | — | — | — |

### 🪟 對話框 Dialog / Drawer / Popover
| （無） | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| （無） | — | — | — | — |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 返回 | ArrowLeft | `size={20}` | 繼承（header 內） |
| 空狀態大圖示 | Settings | `size={48}` + inline `style={{opacity:0.4}}` | 🔴 inline style |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 空狀態容器 | inline-style `<div style={{...}}>` | 無 | 無 | 🔴 全 inline style、color `#666` 硬編碼 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 「即將推出」空狀態 | inline-style div + Settings icon + h2 + p | 🔴 inline style、未用 `.app-placeholder` class（跟 orders/calendar 不一致） |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **整頁分岔 + WIP + 最不一致**：連行動版自己那套 `.app-placeholder` class 都沒用、改全 inline style
- 返回按鈕 class `app-header-btn` **在 globals.css 無定義**（已 grep 確認：全專案僅此一處用、其他頁用 `.app-back-btn`、此鈕會掉樣式 → 確認是 bug、非待確認）
- 空狀態文字色硬編碼 `#666`（不是 `--app-text-*` 變數、也不是 design token）
- 字級 / 間距全 inline hardcode（`fontSize:18/14`、`padding:'64px 24px'` 等）
- 跟 orders / calendar 的空狀態「應該長一樣」、但這頁自成一格、行動版內部都不一致

## 備註
- 為解 `/app/more` 三個死連結而補的橋（檔頭註解明載）、屬「先止血」性質。
- 無「前往網頁版」按鈕（跟 orders/calendar 不同、桌面版設定入口未連）。
</content>
