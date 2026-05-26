# UI 盤點：`/p/tour/[code]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(public)/p/tour/[code]/page.tsx`（含 `_components/tour-header.tsx`、`tour-hero.tsx`、`tour-itinerary.tsx`、`tour-sidebar.tsx`、`tour-footer.tsx`）
> 頁面類型：公開頁（對客行程展示頁、Tokyo Sakura 風、接 DB）

## 一句話用途
客戶從業務分享連結進來看單一行程（封面 / 時間軸日程 / 價格卡 / 業務名片）、可點「立即報名」跳報名頁。

## Layout 骨架
- **頁面框架**：自刻 `div`（sticky header + hero section + `<main>` 兩欄：itinerary 主欄 + sidebar）
- **頁首**：sticky 半透明 header（公司名 + 日期錨點導航 + 分享/收藏 icon + 立即報名 Button）；下方再一條 sticky 日期膠囊導航
- **分頁**：無（單頁長捲動、scroll 追蹤高亮 activeDay）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| Header「立即報名」| `<Button>` | default（被 className 覆寫）| 預設 | 無 | 自刻 `bg-gradient-to-r from-public-primary to-public-accent text-white` | 🟡 對客頁、用 public-* token |
| Sidebar「立即預約」| `<Button>` | default（className 覆寫）| 預設 | 無 | 同上 public-* 漸層 | 🟡 對客頁 |
| Sidebar「諮詢專屬顧問」| `<Button>` | soft-gold（className 又覆寫 border/text）| 預設 | 無 | public-primary（覆寫）| 🟡 用了 Button 但又覆寫色 |
| notFound「返回首頁」| `<Button>` | default | 預設 | 無 | btn-primary | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 無（報名表單在 /register） | — | — | — | — |

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
| 日程時間軸（自刻 `<section>` + 絕對定位 timeline 線/圓點）| 寬鬆 space-y-24 | 無 | 無 | `TourItinerary` 空狀態：MapPin icon + 「行程規劃中」 | 🟡 對客頁版型 |
| Sidebar 行程摘要 `<ul>` | 一般 | 無 | 無 | 條件渲染 | 🟡 對客頁 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| Hero「N天N夜」膠囊 | 自刻 `<span>` | rounded-full | 🔴 `bg-morandi-green text-white`（美術色當語意色）| 🔴 morandi-green 硬當 badge 底色 |
| 報名頁導引「業務員引導」| 自刻 `<span>` | 文字 | 🔴 `text-morandi-green` | 🔴 美術色 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 分享/收藏 | Share2 / Heart | `w-5 h-5` | morandi-secondary hover public-primary |
| Sidebar 資訊 | Calendar / Users / Clock / CheckCircle | `w-4 h-4` / `w-5 h-5` | 🔴 `text-morandi-green` |
| 日程活動 | MapPin/Utensils/Hotel/Camera/Ship/TreePine/Building（emoji→lucide 對照）| `w-5 h-5` | public-secondary / morandi-* |
| Footer | Phone / Mail / User | `w-4 h-4` / `w-8 h-8` | public-* / morandi-* |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| Sidebar 價格卡 | 自刻 `bg-card` div | `rounded-2xl` | `shadow-sm` | 🟡 對客頁 |
| Sidebar Features 卡 | 自刻 `bg-public-primary` div | `rounded-2xl` | 無 | 🟡 對客頁 |
| Footer 業務名片 | 自刻 `bg-card` div | `rounded-2xl` | `shadow-sm` | 🟡 對客頁 |
| 餐食卡 / 住宿卡 | 自刻 div | `rounded-xl` | 無 | 🟡 對客頁（餐食用 morandi-gold/10 OK）|

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入 | `<ModuleLoading fullscreen>` | ✅ 共用組件 |
| notFound | 自刻置中 div + Button | ✅ Button 對齊 |
| 行程空狀態 | TourItinerary 內自刻 | 🟡 對客頁 |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **`public-*` 是一套對客頁專屬色 token**（public-primary / public-accent / public-secondary）— 與 morandi/status 不同軌。這是對客行程頁的獨立配色、待拍板是否歸入統一管控。
- 🔴 **美術色當語意色**：Hero「N天N夜」badge 用 `bg-morandi-green`、Sidebar 多個資訊 icon 用 `text-morandi-green`、報名導引文字用 `text-morandi-green`。morandi-green 是美術色、不是 status 語意色、屬 UI 紅線範圍。
- 🟡 按鈕雖用 `<Button>` 但用 className 大量覆寫漸層/邊框/文字色（Header/Sidebar 三顆），等於繞過 variant 系統。
- 🟡 hero/footer 用 `<img>` 原生標籤（非 next/image）— 對客頁效能可留意但非設計違規。

## 備註
- 此頁 layout `robots: noindex`。
- 文案走 `useTranslations('publicPage')`（i18n）、舊 `constants/labels.ts` 已標 TODO 待移除。
- 結論：整頁是「對客行程展示頁」、刻意有自己視覺（public-* token）。**morandi-green 當語意/裝飾色那幾處是真違規**、建議改 design token 或 public-* 專屬色；public-* 體系本身待 William 拍板是否納入 ERP 統一。
