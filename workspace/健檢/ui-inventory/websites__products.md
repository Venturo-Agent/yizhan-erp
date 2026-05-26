# UI 盤點：`/websites/products`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/websites/products/page.tsx`
> 頁面類型：`詳情殼（WIP skeleton）`

## 一句話用途
產品上架管理：挑哪些行程展示到客戶官網（{subdomain}.venturo.tw）、編輯行銷文案/SEO/封面圖。目前是 Day 1 skeleton、Day 7 才會 reuse 既有 `/marketing/website` 樣板落地（tour list + toggle 上架 + 編輯詳情）。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`
- **頁首**：`title="產品上架"` + `icon={Globe}`、有麵包屑（客戶官網 / 產品上架）、無頁首動作按鈕
- **分頁**：無（skeleton）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 說明卡右上「切到版面設計」 | `<Button>` | outline | sm | LayoutIcon | morandi-gold(outline) | ✅ |

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
| 無（Day 7 才加 toggle 上架） | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 無（Day 7 才加 tour list） | — | — | — | Card 占位「Day 1 skeleton」 | — (WIP) |

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
| 頁首 | Globe | 框架預設 | — |
| 切到版面設計 | LayoutIcon（Layout） | `w-4 h-4` | 繼承 button |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 說明卡 | `<Card>` p-6 `border-0 bg-morandi-container/30` | 組件預設 | 組件預設(被 border-0 改) | ✅ |
| skeleton 占位卡 | `<Card>` p-8 text-center `border-0 bg-morandi-container/20` | 組件預設 | 組件預設 | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| skeleton 占位「Day 1 skeleton / Day 7 落地」 | Card 內文字 | — (WIP 占位) |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **頁面為 WIP skeleton（標記：半成品）**：只有一張說明卡 + 一張占位卡、無實際 tour list / toggle / 編輯功能。Day 7 計畫 reuse `/marketing/website` 樣板。
- **Card 用 `border-0`**：兩張 Card 都拔掉 border 改用 `bg-morandi-container/30/20` 底色當區隔。屬刻意設計（淡底卡片）、token 走對、不算違規但與全站有 border 的 Card 樣式略異、標「待確認」。
- 按鈕走 `<Button variant="outline">`、token 正確、無 Tailwind 預設色、無美術色當語意色。

## 備註
- 半成品頁。註解明確寫 Day 7 會 reuse 既有 `/marketing/website` list 樣板（不重複造輪）、符合抽象層紀律。
- 與 `/marketing/website`（行銷模組視角）功能重疊：兩者都做「官網行程上架」、差別是 `/websites/*` 是「客戶官網加購」視角入口。彙整時注意這組路由將來可能整併、避免兩套 SSOT。
