# UI 盤點：`/ai`（AI Hub）

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/ai/page.tsx`（→ `_components/AiConversationsTab.tsx`）+ `layout.tsx`（`AiSidebar.tsx`）+ `AiSettingsDialog.tsx`（齒輪 dialog：dashboard/retro/setup/bots/policy tabs）
> 頁面類型：沉浸式對話介面 + 收件匣（多通路 LINE/FB/IG）

## 一句話用途
員工在一個地方看 / 回所有社群通路（LINE / FB / IG）客戶訊息、管 AI 自動回覆開關、看 AI 速記卡（客戶長期記憶）與對話復盤；齒輪打開滿版設定 dialog（通道接入 / AI 機器人 / 復盤 / policy）。

## Layout 骨架
- **頁面框架**：自刻 `fixed` 沉浸式 layout（`ai/layout.tsx`、跟 `/channels` 同套）。外層 `p-3` + `rounded-xl border` card 包 `AiSidebar` + `children`；右側另留 `#ai-hub-business-panel-mount` portal 掛點給業務面板
- **page.tsx 本體**：只 render `<AiConversationsTab hideList />`（列表交給 sidebar、主畫面只 render thread）
- **頁首**：無全站 header（沉浸式）。sidebar 有 header（`AI Hub` 標題 Sparkles + 收合 / 齒輪 icon button）；對話 thread 自刻 `ConversationHeader`
- **分頁**：無；對話列表走 SWR（broadcast realtime、不 polling）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| sidebar header「收合」 | 手刻 `<button>` | — | `p-1` | PanelLeftClose | morandi-secondary + gold-light hover | 🔴 手刻 |
| sidebar header「設定」(齒輪) | 手刻 `<button>` | — | `p-1` | Settings | morandi-secondary | 🔴 手刻 |
| sidebar 收合態「展開」 | 手刻 `<button>` | — | `p-1.5` | PanelLeftOpen | morandi-secondary | 🔴 手刻 |
| ConversationHeader「復盤」 | `<Button>` | outline | sm `h-8` | FileText | outline | ✅ |
| ConversationHeader「業務面板」開關 | 手刻 `<button>` | — | `p-1.5 rounded-lg` | PanelRight | active=`morandi-gold/20` / muted | 🔴 手刻 toggle |
| ConversationHeader 群組「改名 / 重抓頭像」 | 手刻 `<button>` | — | inline | Pencil / RefreshCw | morandi-muted→primary | 🔴 手刻 + 編輯用 Pencil（非全站 Edit2） |
| ConversationHeader 改名「✓ / ✗」 | 手刻 `<button>` | — | inline | Check / X | status-success / morandi-muted | 🔴 手刻 |
| ReplyComposer「送出」 | `<Button>` | default（金漸層） | 預設 | Send / Loader2 | btn-primary | ✅（與 channels composer 統一） |
| BusinessPanel「關閉」 | 手刻 `<button>` | — | inline | X | morandi-muted | 🔴 手刻 |
| SpeedCard「立刻生成 / 重生」 | `<Button>` outline + 手刻 icon button | outline / — | sm h-7 / `p-1` | Sparkles / Loader2 | outline / morandi-muted→gold | 🟡 混用（大鈕走 Button、小 icon 鈕手刻） |
| SpeedCard「編輯 / 清空」 | 手刻 `<button>` | — | `p-1` | Pencil / X | morandi-muted→primary / →status-danger | 🔴 手刻 + 編輯用 Pencil |
| ConversationNotes「儲存」 | `<Button>` | default | sm h-7 | — / Loader2 | btn-primary | ✅ |
| QuickReplyDrawer 模板 chip | 手刻 `<button>` | — | `px-2.5 py-1 rounded-full` | Loader2 | border-morandi-muted + gold hover | 🟡 手刻 chip 鈕（QuickReplyDrawer 似未在主流程掛載、待確認） |
| RetrospectiveModal「產復盤」 | `<Button>` | default | sm | Sparkles / Loader2 | btn-primary | ✅ |
| RetroModal / SpeedCardEditor 關閉 | 手刻 `<button>` | — | inline | X | morandi-muted | 🔴 手刻 |
| RetroEntry「刪除」 | 手刻 `<button>` | — | `p-1` | X | morandi-muted→status-danger | 🔴 手刻（刪除用 X 而非 Trash2） |
| RetroEntry「儲存 / 取消」notes | `<Button>` | default / outline | sm h-7 | Check / Loader2 | btn-primary / outline | ✅ |
| RetroEntry 狀態快切 chip | 手刻 `<button>` | — | `px-2 py-0.5 rounded-full` | — | 依 status 色（見 badge） | 🟡 手刻 chip |
| SpeedCardEditor「儲存 / 取消」 | `<Button>` | default / outline | sm | Check / Loader2 | btn-primary / outline | ✅ |
| AiSettingsDialog tab 按鈕 | 手刻 `<button>` | — | `px-3 py-1.5 rounded-md` | tab icon | active=`morandi-gold-light` | 🔴 手刻 tab（沉浸式 tab 慣例） |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| ConversationHeader 改名 | `<Input>`（ui/input） | text h-7 | 共用 | ✅ |
| ReplyComposer 回覆 | 手刻 `<textarea>` rows=1 | — | `border-border bg-background focus:ring-morandi-gold` | 🟡 手刻（W 5/19 明文與 channels 統一） |
| ConversationNotes 備忘 | 手刻 `<textarea>` rows=3 | — | `border-morandi-muted/30 bg-morandi-container/10 focus:ring-morandi-gold/40` | 🟡 手刻、邊框 token 跟 composer 不同套 |
| RetroEntry notes | 手刻 `<textarea>` | — | `border-input bg-background focus:ring-ring` | 🔴 用 `border-input` / `focus:ring-ring`（shadcn 預設、非 morandi token） |
| SpeedCardEditor JSON | 手刻 `<textarea>` font-mono | — | `border-input bg-background focus:ring-ring` | 🔴 同上 shadcn 預設 token |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| （主對話介面無；channel filter 在 hideList 模式被隱藏） | — | — | — |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| BusinessPanel「自動回覆」開關 | `<Switch>`（ui/switch） | ✅ |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 對話列表（sidebar `<Link>` map / 主畫面 280px button map） | `px-3 py-2(.5)` | 無 | 無 | 「尚無對話…」+ Bot icon + FB/IG 設定連結 | 🟡 收件匣列表、非資料表 |
| 訊息流（map MessageBubble） | `space-y-3 px-4 py-4` bg-morandi-container/10 | 無 | 無 | 「這個對話還沒有訊息」置中 | 🟡 對話流 |
| 復盤歷史列表（RetroModal） | `space-y-3` 卡片 | 無 | 無 | 虛線框「尚無復盤紀錄」 | 🟡 卡片列表 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| AI Hub 設定（齒輪） | `<Dialog>`/`DialogContent` size=full | 1 | 無 footer（內容自帶 tab） | ✅ |
| 對話復盤 RetrospectiveModal | 手刻 `createPortal` + `fixed inset-0 bg-black/40` | — | 無統一 footer | 🔴 手刻 modal、未用 FormDialog/Dialog 組件、`bg-white` 硬寫底色 |
| 速記卡編輯 SpeedCardEditor | 手刻 `createPortal` + `fixed inset-0 bg-black/30` | — | `<Button>` 取消/儲存 | 🔴 手刻 modal、`bg-white` 硬寫 |
| 圖片 ImageLightbox | 手刻 `createPortal` + `fixed inset-0 bg-black/85` | — | — | 🟡 手刻燈箱（合理） |
| 業務面板 BusinessPanel | 手刻 `<div>` 透過 portal 掛 layout mount 點 | — | — | 🟡 手刻側欄面板 |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| channel badge（LINE/FB/IG） | 手刻 `<span>` + icon | `rounded` / 圓角標 | `bg-green/blue/pink-100`（Tailwind 預設色） | ✅ 品牌例外（W 5/23 拍板社群識別色合法） |
| 對話列表頭像 channel 角標 | 手刻圓圈 | `rounded-full` | 同上品牌色 | ✅ 品牌例外 |
| 未讀數紅點 | 手刻 `<span>` | `rounded-full` | `bg-status-danger-bg0`（疑似拼錯的 class、應為 `bg-status-danger`） | 🔴 class 名 `bg-status-danger-bg0` 看似錯字 / 失效 class（`-bg0` 不存在）、3 處重複 |
| bot 暫停標 | Pause icon | inline | `text-orange-500`（Tailwind 預設色） | 🔴 用 Tailwind `orange-500`、非 status token |
| AI 信心 emoji（🟢🟡🔴） | 純 emoji | — | — | 🟡 用 emoji 表信心、非 token badge（刻意設計、待確認） |
| 復盤狀態（待review/已看過/已處理/封存） | 手刻 `<span>` border chip | `rounded-full border` | pending=`bg-orange-50 text-orange-700 border-orange-200`（Tailwind 預設色）；其餘走 status-info/success/morandi token | 🔴 pending 狀態用 Tailwind `orange-*`、其餘已是 status token → 同一組 badge 半數沒走 token |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| AI Hub / 速記卡 / 產復盤 | Sparkles | `w-3 h-3`~`w-4 h-4` | morandi-gold / muted |
| 通路 | MessageCircle(LINE) / Facebook / Instagram | `w-3 h-3`~`w-4 h-4` | 品牌色底內 |
| 編輯（改名 / notes） | **Pencil** | `w-3 h-3`~`w-3.5 h-3.5` | morandi-muted | 🔴 全站主流編輯=Edit2、此處用 Pencil |
| 刪除（復盤 / 速記卡） | **X** | `w-3 h-3`~`w-3.5 h-3.5` | morandi-muted→status-danger | 🔴 全站主流刪除=Trash2、此處用 X |
| 確認 / 取消 | Check / X | `w-3 h-3`~`w-4 h-4` | status-success / morandi-muted |
| 收合 / 展開 / 業務面板 | PanelLeftClose/Open / PanelRight | `w-4 h-4` | morandi |
| 群組 / bot / 暫停 | Users / Bot / Pause | `w-3 h-3`~`w-5 h-5` | morandi-gold / orange-500 |
| 換頭像 / 重抓 | Camera / RefreshCw | `w-3.5 h-3.5`~`w-4 h-4` | white / morandi |
| 復盤展開 | ChevronUp / ChevronDown | `w-4 h-4` | morandi-muted |
| 設定 tab | LayoutDashboard / BookOpenCheck / Plug / Bot / Sliders / Settings | `h-4 w-4` | morandi |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 外層 card | 手刻 `<div>` | `rounded-xl` | 無 | ✅ |
| 我方(客服)訊息泡泡 | 手刻 | `rounded-2xl rounded-tr-sm` | 無 | bg `morandi-primary text-white`（深色底白字） |
| 我方(AI)訊息泡泡 | 手刻 | `rounded-2xl rounded-tr-sm` | 無 | bg `morandi-gold/20` |
| 對方(客戶)訊息泡泡 | 手刻 | `rounded-2xl rounded-tl-sm` | 無 | bg `morandi-container/60` |
| 業務面板 BusinessPanel | 手刻 | `rounded-xl border` | 無 | ✅ |
| 復盤 entry 卡 | 手刻 | `rounded-xl border` | 無 | bg `bg-white` 硬寫 |
| RetroModal / SpeedCardEditor modal 殼 | 手刻 | `rounded-2xl` / `rounded-xl` | `shadow-xl` | 🔴 `bg-white` 硬寫底色（非 `bg-card`/`bg-background` token） |
| 設定 dialog tab | 手刻 button | `rounded-md` | 無 | ✅ |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 操作結果 | `sonner` toast | ✅ |
| 刪除確認 | `window.confirm()`（速記卡 / 復盤刪） | 🔴 用瀏覽器原生 `confirm()`、非統一確認 dialog |
| 載入 | Loader2 spin / 「載入中...」文字 | ✅ |
| 列表載入失敗 | 手刻文字 `text-status-danger` | ✅ |
| 空狀態 | 手刻文字 + Bot icon + 設定連結 | ✅ |
| 無權限「沒有權限存取 AI Hub」 | layout 手刻置中 | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **`bg-status-danger-bg0` 疑似失效 class（多 1 個 `0`）**：未讀數紅點 3 處（主列表 / sidebar 展開 / sidebar 收合）都寫這個、`-bg0` 不是合法 token、紅點底色可能根本沒上色 → 高優先修
- **編輯用 `Pencil`、刪除用 `X`、不是全站黃金標準 `Edit2` / `Trash2`**（改名 / notes 編輯 / 復盤刪 / 速記卡清空、多處）
- **Tailwind 預設色混入語意位**：bot 暫停 `text-orange-500`、復盤 pending 狀態 `bg-orange-50 text-orange-700 border-orange-200`（同組 badge 其餘已走 status token、就 pending 沒對齊）
- **shadcn 預設 token 漏網**：RetroEntry notes / SpeedCardEditor JSON textarea 用 `border-input` + `focus:ring-ring`、非 morandi 系（其他 textarea 多走 `border-border focus:ring-morandi-gold`）→ 同頁 textarea 三套邊框寫法
- **手刻 modal 用 `bg-white` 硬寫底色**：RetrospectiveModal / SpeedCardEditor / RetroEntry 卡、未走 `bg-card`/`bg-background` token（dark mode / 改色會破）；且兩個 modal 沒走 `Dialog`/`FormDialog` 組件、各自 `createPortal` + `fixed inset-0`
- **原生 `window.confirm()`** 做刪除確認、未走統一確認框
- 大量 header / icon 操作鈕手刻 `<button>`（沉浸式 sidebar 慣例、4 頁皆同 pattern）

## 備註
- **三對話介面比對（channels / ai / messaging）總結**：
  - composer（輸入框 + 送出鈕）：channels ChannelView 與 ai ReplyComposer **完全統一**（W 5/19 明文拍板、`border-border bg-background focus:ring-morandi-gold` + Send/Loader2 + default 金漸層送出鈕）✅
  - 訊息泡泡：兩者都 `rounded-2xl` + 頭像 `w-8 h-8 rounded-full bg-morandi-gold/20`、結構一致；**但「自己/我方」泡泡配色分岔** — channels 我方=`morandi-gold/20`（金）、ai 我方客服=`bg-morandi-primary text-white`（深底白字）、ai 我方 AI=`morandi-gold/20`。即「誰是我」的視覺語言兩頁不同
  - messaging 已是純轉址、無對話 UI（內容遷進 ai）→ 三者實為「兩套對話組件」（channels ChannelView vs ai MessageBubble+ReplyComposer），composer 統一、泡泡配色未統一
- AiSettingsDialog 是滿版設定 dialog（dashboard/retro/setup/bots/policy 5 tabs）；setup/bots tab 內部 UI 未細掃（屬子設定、若要全盤點需另讀 AiSetupTab/AiSettingsTab/AiRetrospectiveTab/setup/*）
- QuickReplyDrawer 元件存在但主流程似未掛載（ConversationHeader/thread 未見引用）、**待確認**是否 dead code
