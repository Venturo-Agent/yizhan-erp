# UI 盤點：`/websites/design`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/websites/design/page.tsx`
> 頁面類型：`全螢幕編輯器（WIP skeleton）`

## 一句話用途
官網版面設計的全螢幕 Canvas 編輯器（跳脫 (main) 的 sidebar/header 框、`fixed inset-0 z-50` 佔滿 viewport）。目前是 Day 1 skeleton、3 欄 layout（左元件庫 / 中 canvas / 右屬性）尚未填內容。

## Layout 骨架
- **頁面框架**：自刻 div（`fixed inset-0 z-50 flex flex-col bg-[#FDFAF6]`）、刻意跳脫 ContentPageLayout / ListPageLayout
- **頁首**：自刻 top bar（LayoutIcon + 「官網版面設計」+「Esc 退出」提示 + 退出按鈕）、無麵包屑（全螢幕模式刻意不放）
- **分頁**：無
- **退出**：按 Esc 或左上「退出」回 `/websites/products`

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 右上「退出」 | 手刻 `<button>` | — | px-3 py-1 text-xs | X | text-morandi-secondary hover morandi-primary + morandi-container 底 | 🔴 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 無（skeleton） | — | — | — | — |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| 無 | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 無 | — | — | — | — | — |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — | — |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| top bar 標題 | LayoutIcon（Layout） | `w-5 h-5` | text-morandi-primary |
| 退出 | X | `w-4 h-4` | 繼承（morandi-secondary） |
| 元件庫占位 spinner | Loader2 | `w-5 h-5` | text-morandi-muted/40 |
| canvas 占位 | LayoutIcon | `w-12 h-12` | text-morandi-muted/40 |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 左欄「元件庫」 | 自刻 `<aside>`（w-64 border-r bg-card） | — | — | ✅（結構） |
| 中央「Canvas 預覽區」 | 自刻 `<main>`（bg-morandi-container/20） | — | — | ✅（結構） |
| 右欄「屬性」 | 自刻 `<aside>`（w-72 border-l bg-card） | — | — | ✅（結構） |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 元件庫占位「Day 1 skeleton / Day 4 落地」 | Loader2 + 文字 | — (WIP 占位) |
| canvas 占位「Day 5-6 落地」 | LayoutIcon + 文字 | — (WIP 占位) |
| 右欄占位「選取元件後顯示屬性」 | 純文字 | — (WIP 占位) |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **頁面為 WIP skeleton（標記：半成品）**：左/中/右三欄都是占位文字（Day 1 skeleton / Day 4-6 落地）、無實際功能。盤點以骨架為準。
- **退出鈕手刻 `<button>` 而非 `<Button>` 組件**：用 `text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50` 自刻樣式。全螢幕編輯器 top bar 屬特殊場景、可考慮用 `Button variant="ghost"`；目前手刻但 token 用對（無 Tailwind 預設色）、標 🔴 形式不統一。
- **背景硬編 hex `bg-[#FDFAF6]`**：第 29 行直接寫死米色 hex、未走 token（理應走 `bg-morandi-cream` 或 `bg-background`）。違反 UI 紅線「不 hardcode 顏色」。**重點項**。
- 其餘色彩（morandi-primary/secondary/muted/container、border、bg-card）皆走 token、正確。

## 備註
- 半成品頁、全螢幕 Canvas 編輯器外殼已搭、內容待 Day 4-6 填。
- 刻意不套 ContentPageLayout（全螢幕沉浸式編輯）、屬合理設計選擇。
- 主要待修：`bg-[#FDFAF6]` 硬編改 token。
