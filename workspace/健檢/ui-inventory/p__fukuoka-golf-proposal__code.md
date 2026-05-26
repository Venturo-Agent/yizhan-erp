# UI 盤點：`/p/fukuoka-golf-proposal/[code]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(public)/p/fukuoka-golf-proposal/[code]/page.tsx`（含 `_components/FukuokaGolfProposalHero.tsx`、`FukuokaGolfProposalItinerary.tsx`、`FukuokaGolfProposalHotels.tsx`、`FukuokaGolfProposalDining.tsx`）
> 頁面類型：公開頁（對客一次性客製提案頁、Editorial Magazine 風、資料寫死在組件內）

## 一句話用途
給特定客戶看的福岡高爾夫 5 天提案（8 人打球 / 8 人太太專屬行程）、雜誌編輯風、含行程 / 住宿 / 餐飲深度體驗、內容硬編、純展示。

## Layout 骨架
- **頁面框架**：自刻 `div`（🔴 inline `backgroundColor: '#FAF8F5'` 米白 + Hero + max-w-6xl 內容區 space-y-20 + footer）
- **頁首**：無；滿版圖 Hero（米白漸層至 50% + 大標題 + InfoBlock 日期/人數）
- **分頁**：無（單頁長捲動、framer-motion whileInView）

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
| 行程 / 住宿 / 餐飲區塊（自刻 grid / 卡片）| 寬鬆 | 無 | 無 | n/a（硬編）| 🟡 對客一次性客製 |
| 餐廳推薦 list（硬編 restaurants 陣列）| 一般 | 無 | 無 | n/a | 🟡 對客客製 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| eyebrow 英文小標 | 自刻 span | 文字 | 🔴 inline `#666`/`#8B7355`/`#999` | 🟡 對客客製 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 刻意無 emoji（Dining 組件註解明寫「無 emoji · 襯線字體 · 雜誌排版」）| — | — | — |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 住宿 / 餐廳卡 | 自刻（inline border/hex）| 多直角（editorial 風）| 無 / inline | 🟡 對客客製 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無（靜態硬編） | — | — |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **對客頁、明顯是一次性客製設計、刻意脫離 ERP design system、待拍板是否納入統一**：整頁 Editorial Magazine 風、全 inline style hardcode hex（`#FAF8F5` / `#1a1a1a` / `#8B7355` / `#666` / `#444` / `#999`）、Noto Serif TC 襯線、framer-motion。
- 🔴 圖片用 Unsplash placeholder `<img>`（餐廳/住宿）+ 本地 `/images/fukuoka-hero.jpg`（Hero）、非 next/image。
- 🔴 刻意無圖示（Dining 組件註解自證 editorial 設計意圖）。
- 內容資料（餐廳/價格/體驗）全寫死在組件常數、不接 DB；`isPreview` 宣告未使用。
- 與 fukuoka-family-proposal Hero 幾乎同構（同一 editorial 模板複製、僅文案不同）— 三 proposal 頁有重複模板可抽。

## 備註
- footer 文案：「此為 Venturo 客製化行程提案 · 詳細資訊請洽業務人員」— 自證一次性客製。
- 結論：**屬刻意獨立的一次性對客提案、不建議硬改成 morandi**。samui/fukuoka-family/fukuoka-golf 三頁同性質；若納管應評估抽一套共用 proposal 模板 + CIS token、而非逐頁改色。
