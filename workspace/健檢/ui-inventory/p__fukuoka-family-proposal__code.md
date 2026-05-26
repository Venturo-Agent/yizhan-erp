# UI 盤點：`/p/fukuoka-family-proposal/[code]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(public)/p/fukuoka-family-proposal/[code]/page.tsx`（含 `_components/FamilyProposalHero.tsx`、`FamilyProposalItinerary.tsx`、`FamilyProposalHotels.tsx`）
> 頁面類型：公開頁（對客一次性客製提案頁、Editorial Magazine 風、資料寫死在組件內）

## 一句話用途
給特定客戶看的福岡三代同堂 6 天 5 夜家族提案（雜誌編輯風封面 / 行程 / 精選住宿）、內容硬編、純展示。

## Layout 骨架
- **頁面框架**：自刻 `div`（🔴 inline `backgroundColor: '#FAF8F5'` 米白 + Hero + max-w-6xl 內容區 + footer）
- **頁首**：無；滿版圖 Hero（米白漸層覆蓋 + 大標題 + InfoBlock 日期/人數）
- **分頁**：無（單頁長捲動、framer-motion whileInView 進場）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 無（純展示、無互動按鈕）| — | — | — | — | — | — |

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
| 行程 / 住宿區塊（自刻 grid / 編輯排版）| 寬鬆 py-32 | 無 | 無 | n/a（硬編）| 🟡 對客一次性客製 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 住宿「方案主軸」標籤 | 自刻 span | 直角 | 🔴 inline `#8B7355` 棕 | 🟡 對客客製 |
| eyebrow 英文小標 | 自刻 span | 文字 | 🔴 inline `#666`/`#8B7355` | 🟡 對客客製 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 無 lucide / 無 emoji（刻意 editorial 無圖示）| — | — | — |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 住宿區塊 | 自刻 grid + 🔴 inline `border #E5E5E5` | 🔴 直角（無圓角、editorial 風）| 無 | 🟡 對客客製 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無（靜態硬編） | — | — |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **對客頁、明顯是一次性客製設計、刻意脫離 ERP design system、待拍板是否納入統一**：整頁 Editorial Magazine 風、全 inline style hardcode hex（`#FAF8F5` 米白底 / `#1a1a1a` / `#8B7355` 棕 / `#666` / `#444` / `#999` / `#E5E5E5`）、Noto Serif TC 襯線 + `system-ui` eyebrow、framer-motion 動畫。
- 🔴 圖片混用：Hero 用本地 `/images/fukuoka-hero.jpg`、住宿用 Unsplash placeholder `<img>`（非 next/image）。
- 🔴 刻意無圖示（editorial 風格、與 samui 的 emoji 風不同）。
- 內容資料全寫死、不接 DB；`code` 參數讀了但僅 await、未用於分流。
- 與 fukuoka-golf-proposal Hero 幾乎同構（同一套 editorial 模板複製）。

## 備註
- footer 文案：「此為 Venturo 客製化行程提案」— 自證一次性客製。
- 結論：**屬刻意獨立的一次性對客提案、不建議硬改成 morandi**。三個 proposal 頁同性質、一起拍板是否抽 proposal CIS。
