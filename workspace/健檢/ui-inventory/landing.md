# UI 盤點：`/landing`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/landing/page.tsx`（單檔、含 5 個 inline section 組件）
> 頁面類型：公開頁（行銷首頁 / Landing Page）

## 一句話用途
對外行銷首頁、介紹 Venturo ERP 賣點（報價/團控/收款）+ 定價方案、CTA 導向 `/login` 或 mailto Demo。

## Layout 骨架
- **頁面框架**：自刻 — `<main className="min-h-screen">` 包 5 個 section（Hero / PainPoints / Features / Pricing / Footer）、全部 inline 在同一檔
- **頁首**：無導覽列、Hero 直接當頁首（大標 + 副標 + 2 顆 CTA）
- **分頁**：無
- **server component**：是（無 `'use client'`、純靜態行銷頁）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| Hero「免費體驗」 | 手刻 `<Link>` | — | px-8 py-3.5 | ArrowRight | `bg-morandi-gold text-white hover:bg-morandi-gold-hover` | 🟡 行銷頁獨立 CTA、非共用 `<Button>` |
| Hero「預約 Demo」 | 手刻 `<a mailto>` | — | px-8 py-3.5 | — | `border-morandi-muted bg-card text-morandi-primary` | 🟡 同上 |
| 方案卡「開始使用」×3 | 手刻 `<Link>` | — | w-full py-2.5 | — | popular: `bg-morandi-gold text-white`；一般: `border-morandi-muted bg-card` | 🟡 同上 |

### ⌨️ 輸入框 Input / Textarea
N/A（無表單）

### 🔽 下拉 / 選擇
N/A

### ☑️ 勾選 / 開關
N/A

### 📋 表格 / 列表
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 痛點 / 功能 / 方案皆用 `grid sm:grid-cols-3` + 手刻卡片 | — | — | — | — | 🟡 行銷排版、不適用列表標準 |

### 🪟 對話框
N/A

### 🏷️ 狀態標籤 Badge / Status / Tag
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 方案「最受歡迎」 | 手刻 `<span>` | rounded-full | `bg-morandi-gold text-white` | 🟡 行銷 badge |
| 方案「限前 50 家」 | 手刻 `<span>` | rounded-full | `bg-cat-pink-bg text-cat-pink` | 🟡 借用分類色 cat-pink 當行銷 badge |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| Hero CTA 箭頭 | ArrowRight | `size="1.125em"` | 繼承 white |
| 痛點卡 | Clock / ScanLine / MessageSquare | `size="1.5em"` | `text-status-warning` |
| 痛點箭頭 | ChevronRight | `size="0.875em"` | `text-morandi-muted` |
| 功能卡 | LayoutDashboard / FileText / Wallet | `size="1.5em"` | `text-morandi-primary` |
| 方案勾選 | Check | `size="1em"` | `text-status-warning` |
| Footer logo | Sparkles | `size="1.25em"` | `text-status-warning` |
| Footer email | Mail | `size="0.875em"` | 繼承 |

全用 lucide、尺寸統一走 em 寫法（`size="x.xxem"`）、一致。

### 🃏 卡片 / 容器 Card / Panel
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 痛點卡 | 手刻 div | `rounded-xl` | `hover:shadow-md` | 🟡 行銷卡、非 shadcn Card |
| 功能卡 | 手刻 div | `rounded-xl` | `shadow-sm` | 🟡 同上 |
| 方案卡 | 手刻 div（PlanCard） | `rounded-xl` | `shadow-sm` / popular `shadow-lg ring-1` | 🟡 同上 |
| 截圖預留區 | 手刻 div | `rounded-lg` | dashed border | 🟡 placeholder「截圖預留區」 |

### 🔔 回饋 / 空狀態 / 載入
N/A

## 🔴 不統一 / 異常標記（重點）
- **CTA 全手刻、未走共用 `<Button>`**：3 種按鈕（免費體驗 / 預約 Demo / 開始使用）都是手刻 `<Link>`/`<a>` 的 className、沒用 `variant="default"`（金漸層）。行銷頁可接受獨立設計、但「免費體驗」用的是 `bg-morandi-gold` 純色填底 + 白字、跟全站主 CTA 的「淡金漸層 + 暖深棕字」(`--btn-primary-*`) 視覺不一致 → **待拍板是否與全站 CTA 統一**。
- **`bg-cat-pink-bg text-cat-pink`（限前 50 家 badge）**：借用「分類色」cat-pink 當行銷強調色、非語意色也非品牌主色。
- **顏色軌混用**：用 `text-status-warning`（語意「警告」色）當行銷的「強調金」（痛點 after、方案勾選、Footer logo Sparkles）。語意色被當美術色用、跟 UI 紅線「美術色 ↔ 語意色不混用」方向相反（此處是反向：拿語意色當美術色）→ 待拍板。
- **重複 className typo**：line 82 `bg-morandi-container/50/50`（多打一段 `/50`）、Tailwind 會解析失敗 → 此處實際無背景色生效。**疑似 bug、建議修為 `bg-morandi-container/50`**。
- **`截圖預留區` placeholder**：功能 section 每卡有一塊 dashed 邊框「截圖預留區」、尚未放真實產品截圖（行銷頁未完成項）。

## 備註
- 整頁 hardcode email `hello@venturo.app`、品牌字串 `Venturo`（符合 VENTURO 命名、中文未出現「漫途」）。
- 年份走 `getCurrentYear()`（`@/lib/tenant`）、非寫死、OK。
- 全頁無 Tailwind 預設色（無 bg-blue/red/green-xxx）、顏色都走 morandi-* / status-* / cat-* token、CIS 大方向守住。
- 定性：**明顯對客行銷獨立設計**、手刻按鈕/卡片屬合理；唯一硬 bug 是 line 82 的 `/50/50` className typo。
