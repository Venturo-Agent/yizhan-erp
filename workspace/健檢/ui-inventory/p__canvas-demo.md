# UI 盤點：`/p/canvas-demo`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(public)/p/canvas-demo/page.tsx`（渲染 `src/components/canvas-renderer/CanvasRenderer.tsx` + fixtures/sendai-sample）
> 頁面類型：公開頁（對客行程展示 Demo、不接 DB、純 fixture）

## 一句話用途
給 William 視覺驗收 Canvas 展示行程引擎的範例頁（東京・仙台私人包團六日）、純 fixture、不接 DB。

## Layout 骨架
- **頁面框架**：自刻 `CanvasLayout`（兩欄 grid：左 260px Sidenav 固定 / 右 1fr 內容、maxWidth 1480、全 inline style）
- **頁首**：無傳統頁首；走 `CanvasCover` 封面 section + 左側 `CanvasSidenav` 章節導航
- **分頁**：無（單頁長捲動 + smooth scroll 錨點）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| Sidenav 章節錨點 | 自刻 `<a class="yc-nav-item">` | n/a | n/a | 無 | YONGCHENG_COLORS（inline）| 🟡 對客獨立 CIS |

（本頁無 ERP 標準操作按鈕、整頁是對客展示版型）

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
| `CanvasOverviewTimeline` / `CanvasStaysSection`（自刻時間軸 / 卡片 grid） | inline style | 無 | 無（雙數 day 用 paper 底交錯） | n/a | 🟡 對客獨立 CIS |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| eyebrow 編號（01/02…）| 自刻 inline `<span>` | 文字 | copper `#C85A38`（YONGCHENG）| 🟡 對客獨立 CIS |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 各 section（飯店/班機/餐廳/路線…）| Canvas 自有 section 組件、多用文字/裝飾、少量自繪 | inline | YONGCHENG_COLORS |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| Hotel/Flight/Restaurant/Route 卡 | `CanvasHotelCard` 等自刻 | inline（多為直角 border）| 無 | 🟡 對客獨立 CIS |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 無（靜態 fixture、無 loading） | — | — |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **對客頁、刻意脫離 ERP design system、待拍板是否納入統一**：整個 `canvas-renderer` 是「展示行程引擎」、走獨立 `YONGCHENG_*` design token（`tokens.ts`、ink/copper/paper/gold）+ 全 inline style + Google Fonts（Noto Serif TC / Noto Sans TC / Cormorant Garamond）。這是 William 2026-05-17 拍板的對客 CIS、非 ERP 內部頁。
- token 已集中（`canvas-renderer/tokens.ts`）、是「自成一套的設計系統」、不是散刻硬編碼 hex。算「有紀律的獨立 CIS」、不算違規。
- 用 `<style dangerouslySetInnerHTML>` 注入 `.yc-*` 前綴 hover/scroll CSS（因 inline style 無法寫 :hover）。

## 備註
- 此頁 `robots: noindex`。
- Phase 2 真實版會走 `/p/tour/[code]/canvas` 從 `tour_display_overrides` 讀 canvas JSON、此 demo 頁可能後續廢除。
- 結論：**不該納入 ERP 統一**、屬刻意獨立的對客展示引擎。若要管控、應「管控 YONGCHENG token 一致性」而非「改成 morandi」。
