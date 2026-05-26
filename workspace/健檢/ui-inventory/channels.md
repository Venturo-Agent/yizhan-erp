# UI 盤點：`/channels`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/channels/page.tsx`（+ `layout.tsx` / `_components/ChannelsSidebar.tsx` / `_components/CreateChannelDialog.tsx`）
> 頁面類型：沉浸式對話介面（Slack 風）— 進來只是轉址 loading、實際 UI 在 layout + sidebar

## 一句話用途
員工進「頻道」首頁、自動導向第一個官方公告頻道（沒選頻道時不顯示 placeholder）；左側 sidebar 是頻道 / 私訊 / 專案群組導覽。

## Layout 骨架
- **頁面框架**：自刻 `fixed` 沉浸式 layout（`channels/layout.tsx`、走 `CUSTOM_LAYOUT_PAGES`、無 ContentPageLayout）。外層 `p-3` + 內層 `rounded-xl border border-border` card 包 `ChannelsSidebar` + `children`
- **page.tsx 本體**：只有一個置中 `Loader2` spinner（`useEffect` 算出第一個官方頻道後 `router.replace`）
- **頁首**：無全站 header（沉浸式）；sidebar 自己有 header（`頻道` 標題 + 搜尋 / 新增 / 收合 icon button）
- **分頁**：無（即時對話、不分頁）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| sidebar header「搜尋」 | 手刻 `<button>` | — | `p-1` | Search | morandi-secondary→primary + gold-light hover | 🔴 手刻、非 `<Button>` |
| sidebar header「新增頻道」 | 手刻 `<button>` | — | `p-1` | Plus | morandi-secondary | 🔴 手刻、非 `<Button>` |
| sidebar header「收起側邊欄」 | 手刻 `<button>` | — | `p-1` | PanelLeftClose | morandi-secondary | 🔴 手刻、非 `<Button>` |
| sidebar 收合態「展開側邊欄」 | 手刻 `<button>` | — | `p-1.5` | PanelLeftOpen | morandi-secondary | 🔴 手刻 |
| sidebar 搜尋態「關閉搜尋」 | 手刻 `<button>` | — | `p-1` | X | morandi-secondary | 🔴 手刻 |
| 頻道 / 同事列項 | `<Link>` / 手刻 `<button>` | — | `px-4 py-1.5` | type icon / 頭像 | morandi-gold-light active 底 | 🔴 導覽列項、性質特殊（可接受、非標準操作鈕） |
| CreateChannelDialog footer「建立 / 取消」 | `EntityFormDialog` 內建 | — | — | — | (走 dialog SSOT) | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| sidebar 頻道搜尋框 | 手刻 `<input>` | text | `bg-transparent` 無邊框、focus 無框 | 🟡 手刻 inline 搜尋、非 `<Input>` 共用組件（沉浸式可接受、標待確認） |
| CreateChannelDialog 頻道名稱 | 手刻 `<input>` | text | `border-border bg-background focus:ring-morandi-gold` | 🟡 手刻、非 `<Input>`（樣式 token 正確） |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| CreateChannelDialog 頻道類型 | `<Select>`（ui/select） | shadcn 共用 | ✅ |
| CreateChannelDialog 綁團 / 私訊對象 | `<Combobox>`（ui/combobox） | 共用 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| （此頁無） | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| sidebar `<ul>`/`<li>` 頻道列表（非 EnhancedTable） | `py-1.5` 緊密 | section 小標 `text-[0.647rem] uppercase` + Pin/Hash icon | 無 | 「尚未加入任何頻道」`text-xs text-morandi-muted` 置中 | 🟡 導覽列表、性質非資料表、不適用 EnhancedTable |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 新增頻道 | `EntityFormDialog` | 1 | 內建（建立 / 取消） | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 未讀紅點 | 手刻 `<span>` 圓點 | `h-2 w-2 rounded-full` | `bg-morandi-gold`（金、非紅） | 🟡 未讀點用金色而非 status-danger（W 之前拍板頻道未讀走金、跟 design 紅線「未讀紅點→status-danger」不一致、標待確認是否為刻意例外） |
| section 小標「置頂 / 私訊 / 專案&群組」 | 手刻 `<div>` | uppercase tracking | morandi-muted + gold icon | ✅ |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 官方頻道類型 | Megaphone / Bot / Bell | `h-3.5 w-3.5` / `h-4 w-4` | opacity-70 / morandi |
| 私訊 section | MessagesSquare | `h-3 w-3` / `h-4 w-4` | morandi-gold / muted |
| 專案群組 | Hash / Briefcase | `h-3 w-3` / `h-4 w-4` | morandi |
| 搜尋 / 新增 / 收合 | Search / Plus / PanelLeftClose / PanelLeftOpen / X | `h-4 w-4` | morandi-secondary |
| 置頂標記 | Pin | `h-3 w-3` | morandi-gold |
| loading | Loader2 (animate-spin) | `h-4 w-4` | morandi-muted |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 外層 card 容器 | 手刻 `<div>` | `rounded-xl` | 無 | ✅ |
| sidebar `<aside>` | 手刻 `<aside>` | 無（直角、border-r 分隔） | 無 | ✅ |
| 收合態頭像圈 / 圖示鈕 | 手刻 | `rounded-lg` / `rounded-full` | 無 | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 操作成功 / 失敗 | `sonner` toast | ✅ |
| 載入 | Loader2 spin（page / sidebar / 開 DM） | ✅ |
| 空狀態「尚未加入任何頻道」 | 手刻文字 | ✅ |
| 無權限「沒有權限存取頻道」 | layout 手刻置中文字 | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **全部 header 操作鈕（搜尋 / 新增 / 收合）都手刻 `<button>` + `p-1` + `hover:bg-morandi-gold-light`、沒走 `<Button>` 任何 variant**（沉浸式 sidebar 的慣例、4 頁皆同 pattern）
- **未讀紅點用 `bg-morandi-gold`（金）而非 `bg-status-danger`** — 跟 design 紅線「未讀紅點→status-danger」表面衝突；疑似 W 拍板「頻道未讀走金」的刻意 channel 例外、**待確認**
- 頻道名 / 搜尋框是手刻 `<input>`、非 `<Input>` 共用組件（token 正確、沉浸式可接受）
- 導覽列表用 `<ul>/<li>`、不是 EnhancedTable（合理、非資料表）

## 備註
- page.tsx 幾乎沒 UI、真正 UI 在 layout + ChannelsSidebar + CreateChannelDialog；單一頻道對話 UI 見 `channels__id.md`
- sidebar 三 section：官方頻道（扁平、type icon）/ 私訊（同事頭像、點擊建/開 DM）/ 專案&群組（# 或 公事包）
- 有可收合（collapsed）模式、變窄成 icon 列（頭像圈 + type icon）、收合按鈕 PanelLeftClose/Open
- 5/23 加頻道搜尋（放大鏡點開展開、空白不擠版面）
