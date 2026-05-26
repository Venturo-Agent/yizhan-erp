# UI 盤點模板（所有頁面清單檔必照此格式填、最後才能彙整成 HTML 大全）

> 此檔是格式範本、不是真實頁面。每個專員掃一頁就照此產一個 `<module>__<page>.md`。

---

# UI 盤點：`<路由路徑、例 /accounting/accounts>`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/.../page.tsx`（含主要 _components）
> 頁面類型：`列表 / 表單 / 儀表板 / 詳情 / 公開頁 / 設定`

## 一句話用途
<這頁讓員工做什麼>

## Layout 骨架
- **頁面框架**：`ListPageLayout / ContentPageLayout / 自刻 div / 其他`
- **頁首**：標題寫法、有無麵包屑、有無頁首動作按鈕
- **分頁**：有/無、用什麼組件

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 例：頁首「新增」 | `<Button>` | default | sm | Plus | btn-primary | ✅ |
| 例：列表行「編輯」 | `<ActionCell>` | default | h-7 | Edit2 | morandi-secondary | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- <例：刪除鈕用 morandi-red 而非 status-danger token（顏色軌分岔）>
- <例：圖示用 Pencil 而非全站主流 Edit2>
- <例：尺寸寫 size={16} 而非統一寫法>
- <例：手刻 button 沒走 ActionCell>
- <例：用了 Tailwind 預設色 bg-red-500>

## 備註
- <掃描時注意到的其他事項、特殊互動、待釐清>
