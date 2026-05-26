# UI 盤點：`/p/samui-proposal/[code]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(public)/p/samui-proposal/[code]/page.tsx`（含 `_components/TourProposalHero.tsx`、`TourProposalItinerary.tsx`、`TourProposalPricing.tsx`、`TourProposalDining.tsx`、`TourProposalActivities.tsx`）
> 頁面類型：公開頁（對客一次性客製提案頁、Luxury 風、資料寫死在組件內）

## 一句話用途
給特定客戶看的蘇梅島 6 天 5 夜包島提案（封面 / 行程 / 費用 Accordion / 餐飲 / 自費活動）、內容硬編、純展示。

## Layout 骨架
- **頁面框架**：自刻 `div`（`bg-background` + Hero + max-w-6xl 內容區 space-y-20 + footer）
- **頁首**：無；Hero section 即頁首（漸層背景 + 波浪 SVG + 標籤膠囊 + 主視覺圖）
- **分頁**：無（單頁長捲動、framer-motion 進場動畫）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 費用 Accordion 展開鈕 | 自刻 `<button>` | n/a | n/a | ChevronDown（lucide）| 🔴 hardcode LUXURY hex（`#C69C6D` 等）| 🟡 對客一次性客製 |

（本頁無 ERP 標準操作按鈕、無 CTA `<Button>`）

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
| 費用明細 Accordion list | 自刻 motion.div | 無 | 無 | n/a（硬編資料）| 🟡 對客客製 |
| 自費活動 grid（3 欄卡片）| 自刻 | 一般 | 無 | n/a | 🟡 對客客製 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| Hero「2026 夏季限定」膠囊 | 自刻 span | rounded-full | 🔴 inline `#c9aa7c` + rgba | 🟡 對客客製 |
| 「自費」標籤 | 自刻 span | rounded-full | 🔴 inline `${LUXURY.secondary}15` | 🟡 對客客製 |
| InfoBadge（日期/人數/轉機）| 自刻 | rounded-full | rgba 白半透明 | 🟡 對客客製 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| Accordion 展開 | ChevronDown（lucide）| `w-5 h-5` | 🔴 inline `LUXURY.secondary` |
| 其餘裝飾 | 🔴 emoji（✈️ 🏨 🚐 🍽️ 🎯 🏝️ 📍 🛏️）| — | — |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 費用 Accordion item | 自刻 motion.div | `rounded-xl` | 無 | 🟡 對客客製（inline border 色）|
| 總計卡片 | 自刻 | `rounded-2xl` | 🔴 inline 漸層 `#1a4a5e→#2d6a7a` | 🟡 對客客製 |
| 飯店卡 | 自刻 | `rounded-2xl` | 🔴 inline boxShadow | 🟡 對客客製 |
| Hero 主視覺框 | 自刻 | `rounded-2xl` | 🔴 inline boxShadow | 🟡 對客客製 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無（靜態硬編、無 loading/toast） | — | — |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **對客頁、明顯是一次性客製設計、刻意脫離 ERP design system、待拍板是否納入統一**：整頁走獨立「Luxury」配色（`LUXURY = { primary:'#2C5F4D', secondary:'#C69C6D', accent:'#8F4F4F', background:'#FDFBF7' }`）+ Hero 另一套 hex（`#1a4a5e`/`#2d6a7a`/`#c9aa7c`）、全 inline style、framer-motion 動畫、Noto Serif TC 襯線字。
- 🔴 大量 hardcode hex / rgba inline style（非 morandi/status token）。
- 🔴 emoji 當功能 icon（✈️🏨🚐🍽️🏝️…）、非 lucide。
- 🔴 圖片用 Unsplash placeholder `<img>`（非真實素材、非 next/image）。
- 內容資料（價格/飯店/活動）全寫死在組件常數內、不接 DB。
- `code === 'preview'` 有讀但未實際使用（`isPreview` 宣告後沒用到）。

## 備註
- footer 文案：「此為 Venturo 客製化行程提案 · 詳細資訊請洽業務人員」— 自證為一次性客製。
- 結論：**屬刻意獨立的一次性對客提案、不建議硬改成 morandi**；若 William 要納管、應評估「是否要抽一套 proposal CIS token 系統」而非逐頁改色。三個 proposal 頁（samui/fukuoka-family/fukuoka-golf）是同一性質、可一起拍板。
