# UI 盤點：`/dashboard`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/dashboard/page.tsx` → `_components/DashboardClient.tsx`（含 widget-settings-dialog / calculator-widget / notes-widget / amadeus-totp-widget / widget-config）
> 頁面類型：儀表板

## 一句話用途
員工登入後的首頁、放可拖拉排序的小工具（計算機 / 便條紙 / Amadeus 2FA 驗證碼）、右上角「小工具設定」可勾選要顯示哪些。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title=「首頁」、breadcrumb=[首頁 → /dashboard]）
- **頁首**：標題走 ContentPageLayout 內建；頁首動作 = `headerActions` 掛 `WidgetSettingsDialog`（一顆「小工具設定」按鈕）
- **分頁**：無（拖拉式 grid、`@container` RWD 1~4 欄、`@dnd-kit` 排序）
- **空狀態**：無啟用 widget 時顯示置中 `<Card>`（Settings 圖示 + 標題 + 說明）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「小工具設定」 | `<Button>` | header-outline | sm | Settings | 走 variant（morandi-gold 系） | ✅ |
| 計算機數字/運算鈕（0-9 / 運算符 / =） | `<Button>` | soft-gold | sm（h-8） | — | 重複 hardcode className（複製 soft variant 配方一份） | 🟡 |
| 計算機「C」清除鈕 | `<Button>` | soft-gold | sm（h-8、col-span-2） | — | hover 走 `status-danger-bg/status-danger`（語意色正確） | 🟡 |
| Amadeus「上傳 QR / 重新設定 / 複製驗證碼」 | `<Button>` | soft-gold | sm | Upload/RefreshCw/Check | 走 variant | ✅ |
| Amadeus idle/active/expired 主互動區 | 手刻 `<button>` | — | 自訂 | Key（idle） | `morandi-blue` 系（品牌藍） | 🟡 |
| 便條紙「新增分頁」 | 手刻 `<button>` + inline `<svg>` plus | — | p-1 | inline SVG（非 lucide） | border/card token | 🔴 |
| 便條紙「刪除分頁」（hover 出現） | 手刻 `<button>` + inline `<svg>` X | — | w-3 h-3 | inline SVG（非 lucide） | hover `status-danger` | 🔴 |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| 計算機算式輸入 | 手刻 `<input>` | text | 透明底 + mono、`morandi-secondary` | 🟡（widget 內輸入、非表單） |
| 便條紙內文 | 手刻 `<textarea>` | — | `border-border/60` + card token | 🟡 |
| 便條紙分頁改名 | 手刻 `<input>` | text | `border-morandi-gold/30` | 🟡 |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （無） | — | — | N/A |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 小工具設定 dialog 內每個 widget 勾選 | `<Checkbox>`（shadcn 共用） | ✅ |
| 計算機「順序計算」開關 | 手刻 `<input type=checkbox>` | 🔴（原生 checkbox、非 `<Checkbox>`） |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| （無表格、改用 widget grid） | — | — | — | Card 空狀態 | N/A |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 小工具設定 | `<Dialog>`（shadcn） | level={1} | 無 footer（即點即切換） | ✅ |
| Amadeus「重置確認」 | `confirm()`（`@/lib/ui/alert-dialog`） | — | 共用 confirm | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| Amadeus 倒數進度條 | 手刻 div + style width | bar | `morandi-blue` / `status-danger`（剩 ≤5s） | 🟡 |
| Amadeus「已複製」提示 | 手刻 span + Check | — | `morandi-green`（美術色當語意色） | 🔴 |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 設定 | Settings | `h-4 w-4` / `h-8 w-8` | morandi-gold |
| 計算機 | Calculator | `w-4 h-4` | white on gold-gradient |
| 便條紙 | Clipboard | `w-4 h-4` | white on gold-gradient |
| 便條紙 新增/刪除分頁 | inline `<svg>`（非 lucide） | `w-3.5/w-3` | currentColor |
| Amadeus | Shield / Upload / RefreshCw / Check / Key | `w-4 h-4` / `w-6 h-6` / `w-8 h-8`（尺寸雜） | morandi-blue 系 |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 空狀態卡 | `<Card>` | `rounded-2xl`（hardcode） | `shadow-sm` | 🟡 |
| 各 widget 外殼 | 手刻 div | `rounded-2xl`（hardcode） | `shadow-lg` + backdrop-blur | 🟡 |
| 便條紙分頁標籤 | 手刻 div（tab 樣） | `rounded-md` | shadow-sm | 🟡 |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| Amadeus 操作回饋 | `toast`（sonner） | ✅ |
| Amadeus 重置確認 | `confirm()` 共用 | ✅ |
| 空狀態（無 widget） | `<Card>` 自刻 | ✅ |
| 載入中 | `return null`（交給 ModuleGuard 外層 loading） | ✅（避免 cascade） |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **便條紙的新增/刪除分頁鈕用 inline `<svg>` 手畫 plus/X、不走 lucide**（全站唯一、應改 Plus / X from lucide-react）。
- **Amadeus widget 大量使用 `morandi-blue`（品牌藍）當主色 + `morandi-green` 當「已複製」成功色**——美術色當語意色、成功狀態應走 `status-success`。
- **計算機「順序計算」開關用原生 `<input type=checkbox>`**、不走全站共用 `<Checkbox>`（同頁 dialog 內就有用 `<Checkbox>`、自家不一致）。
- **計算機 16+ 顆數字鈕每顆都複製一整串 soft variant 的 hardcode className**（`bg-gradient-to-br from-card...`）、明明已套 `variant="soft-gold"` 卻又手寫覆蓋一遍、DRY 破裂。
- Amadeus idle/active/expired 互動區是手刻 `<button>`（非 `<Button>`）、圖示尺寸 `w-4/w-6/w-8` 混用、不統一。

## 備註
- `/`（main 首頁）與 `/dashboard` **render 完全相同的 `DashboardClient`**、UI 100% 一致（見 `main-home.md`）。
- widget 走 `@dnd-kit` 長按拖拉排序、`AVAILABLE_WIDGETS` 三個：計算機 / 便條紙 / Amadeus 驗證碼。
- 這頁是「個人工具面板」性質、不少 widget 內部 UI（計算機按鍵、便條紙 tab）屬於 widget 自有控件、嚴格度可比列表頁低；但 inline SVG 圖示 + morandi-blue/green 當語意色仍建議收斂。
