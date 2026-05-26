# UI 盤點：`/websites`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/websites/page.tsx`
> 頁面類型：`redirect（無 UI）`

## 一句話用途
入口頁、沒有任何 UI、`redirect('/websites/design')`（客戶買加購最常做的事是看/改官網長相、所以開門先到 design）。

## Layout 骨架
- **頁面框架**：無、純 server component `redirect()`
- **頁首**：無
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 無 | — | — | — | — | — | — |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

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
| 無 | — | — | — |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無 | — | — |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- 無 UI 元素可盤點、純 redirect 入口、無對齊問題。

## 備註
- 此頁僅 11 行、`redirect('/websites/design')`。所有實際 UI 在 `/websites/design` 與 `/websites/products`。
