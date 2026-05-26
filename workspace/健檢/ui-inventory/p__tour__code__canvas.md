# UI 盤點：`/p/tour/[code]/canvas`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(public)/p/tour/[code]/canvas/page.tsx`（渲染 `src/components/canvas-renderer/CanvasRenderer.tsx`，資料經 `lib/canvas/canvas-from-tour` + `enrich-itinerary` adapter）
> 頁面類型：公開頁（對客行程展示頁、Canvas 引擎版、接 DB）

## 一句話用途
跟 `/p/tour/[code]` 平行的「Canvas 主題」行程頁；優先用業務在後台發布的 `published_canvas`、沒有則從 tour 資料 auto-generate、交給 CanvasRenderer 渲染。

## Layout 骨架
- **頁面框架**：自刻 `CanvasLayout`（兩欄 grid：左 260px Sidenav / 右 1fr 內容、全 inline style、與 canvas-demo 同一引擎）
- **頁首**：無傳統頁首；走 Canvas 封面 + 左側章節導航
- **分頁**：無（單頁長捲動 + smooth scroll）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| Sidenav 章節錨點 | 自刻 `<a class="yc-nav-item">` | n/a | n/a | 無 | YONGCHENG（inline）| 🟡 對客獨立 CIS |
| notFound「返回首頁」| `<Button>` | default | 預設 | 無 | btn-primary | ✅ |

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
| Canvas 各 section（overview timeline / stays / day blocks）| inline | 無 | 雙數 day paper 底交錯 | 走 notFound | 🟡 對客獨立 CIS |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 無 | — | — | — | — |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| eyebrow 編號 | 自刻 inline span | 文字 | copper（YONGCHENG）| 🟡 對客獨立 CIS |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| Canvas section 內裝飾 | 自有（少量自繪）| inline | YONGCHENG |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| Hotel/Flight/Restaurant/Route/Spotlight 卡 | Canvas section 組件 | inline（多直角）| 無 | 🟡 對客獨立 CIS |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 載入 | `<ModuleLoading fullscreen>` | ✅ 共用組件 |
| notFound | 自刻置中 div + Button | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **對客頁、刻意脫離 ERP design system**：渲染層 100% 是 `canvas-renderer` 引擎（YONGCHENG token + inline style、見 canvas-demo 盤點）。這是 William 拍板的對客展示 CIS、不該改成 morandi。
- 唯一 ERP 標準元件接觸點：notFound 的 `<Button>`（✅）+ `<ModuleLoading>`（✅）。
- 資料取得直接用 `supabase` client query（client 端 `useEffect` 內 .from()），不走 entity hook — 屬資料層紅線 F 範疇、非 UI 盤點重點、僅記錄。

## 備註
- 此頁 layout `robots: noindex`。
- 與 `/p/tour/[code]`（Tokyo Sakura 風）平行存在、URL 不同主題不同；將來預設可能切到 canvas。
- 結論：**不該納入 ERP 統一**、屬刻意獨立的對客展示引擎（同 canvas-demo）。
