# UI 盤點：`/no-access`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/no-access/page.tsx`（單檔、無 _components）
> 頁面類型：公開頁（無權限提示）

## 一句話用途
員工點到沒權限的頁面時的攔截畫面，顯示「存取被拒」+ 兩顆導離按鈕（返回上一頁 / 回首頁）。

## Layout 骨架
- **頁面框架**：自刻 `div`（全螢幕置中 + `bg-morandi-background`）
- **卡片**：`<Card>`（共用組件）`max-w-md p-8 text-center space-y-6`
- **頁首**：卡片內紅圈盾牌 icon + `<h1>` 標題 + 說明文字
- **分頁**：無

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 「返回上一頁」 | `<Button>` | soft-gold | default（w-full） | ArrowLeft | 走 variant | ✅ |
| 「回首頁」 | `<Button>` | default | default（w-full） | Home | 走 variant（金漸層拍板色） | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| （無） | — | — | — | N/A |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （無） | — | — | N/A |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| （無） | — | N/A |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| （無） | — | — | — | — | N/A |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| （無） | — | — | — | N/A |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 紅圈盾牌（危險視覺） | 手刻 div 圓 + ShieldX | circle | `bg-status-danger-bg` + `text-status-danger` | ✅（正確走語意 token） |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 禁止/拒絕 | ShieldX | `size={40}` | `text-status-danger` |
| 返回 | ArrowLeft | `size={16}` | 隨 Button |
| 首頁 | Home | `size={16}` | 隨 Button |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 主卡 | `<Card>`（共用） | 走組件預設 | 走組件預設 | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 整頁即「無權限」空狀態 | 自刻置中卡 | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **本頁基本乾淨、對齊度高**：按鈕全走 `<Button>`（soft-gold + default）、卡片走 `<Card>`、危險視覺正確走 `status-danger` / `status-danger-bg` 語意 token、圖示用 lucide。
- 唯一小瑕：背景用 `bg-morandi-background`（需確認此 class 是否在 tokens 定義；其他頁多用 `bg-background` / `bg-morandi-container`）——**待確認** `morandi-background` 是否為有效 token。
- 圖示尺寸用 `size={40}` / `size={16}` props 寫法（lucide 數字 prop），與部分頁面 `h-4 w-4` className 寫法並存、屬全站尺寸寫法不統一的通病、非本頁獨有。

## 備註
- 可作為「公開提示頁」的**對齊範本**：跟 `/login` 對照、`/login` 用 `morandi-red` 而本頁用 `status-danger`，建議 login 向本頁看齊（顏色軌）。
- 有 i18n（`useTranslations('noAccess')`），全部文案走 i18n、無寫死中文。
