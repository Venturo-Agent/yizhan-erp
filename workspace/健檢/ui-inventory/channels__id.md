# UI 盤點：`/channels/[id]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/channels/[id]/page.tsx`（→ `_components/ChannelView.tsx` + `SendAnnouncementDialog.tsx` + `ChannelMembersDialog.tsx`）
> 頁面類型：詳情 / 對話介面（單一頻道訊息流）

## 一句話用途
員工在某個頻道裡看訊息、發訊息、撤回自己的訊息；公告頻道改成「發送公告」、系統通知頻道唯讀；群組頻道可看 / 管成員。

## Layout 骨架
- **頁面框架**：`page.tsx` 只 render `<ChannelView channelId={id} />`（套在 channels/layout 沉浸式 card 右半）
- **頁首**：ChannelView 自刻 `<header>`（高度 `h-[calc(3.75rem-1px)]` 對齊全局側欄 divider）：頻道名 + description inline（Slack 同行風）+ 右側「N 位成員」按鈕（僅 project/blank 群組顯示）
- **分頁**：無；訊息撈最新 50 則（W 5/23 拍板「員工溝通不是聊天」、Phase B 才補滑載入）

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| header「N 位成員」 | `<Button>` | outline | sm `h-9` | Users | `border-morandi-gold/40` + gold-light hover | ✅（gold icon、稍客製 className） |
| composer「送出」 | `<Button>` | default（金漸層） | 預設 | Send / Loader2 | btn-primary | ✅ |
| 公告頻道「發送公告」 | `<Button>` | default | 預設 | Megaphone | btn-primary | ✅ |
| 訊息 hover「撤回」 | 手刻 `<button>` | — | inline | Trash2 `h-3 w-3` | morandi-muted→morandi-red | 🔴 手刻 + 用 `morandi-red`（美術色）而非 `status-danger`（語意色） |
| SendAnnouncementDialog「清除排程」 | 手刻 `<button>` | — | text | — | morandi-secondary→primary | 🟡 手刻文字鈕 |
| SendAnnouncementDialog footer | `EntityFormDialog` 內建 | — | — | — | (走 dialog SSOT) | ✅ |
| ChannelMembersDialog「加入」 | `<Button>` | default | 預設 | UserPlus / Loader2 | btn-primary | ✅ |
| ChannelMembersDialog「關閉」(footer) | `<Button>` | soft-gold | 預設 | — | soft-gold | ✅ |
| ChannelMembersDialog「移除成員」 | 手刻 `<button>` | — | inline | UserMinus `h-4 w-4` | morandi-muted→morandi-red | 🔴 手刻 + `morandi-red` 而非 status-danger |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| composer 訊息輸入 | 手刻 `<textarea>` | rows=1 自動 | `border-border bg-background focus:ring-morandi-gold` | 🟡 手刻 composer（token 正確、Enter 送 / Shift+Enter 換行） |
| 公告內容 | 手刻 `<textarea>` rows=6 | — | 同上 | 🟡 手刻 |
| 公告排程時間 | 手刻 `<input type="time">` | time | `border-border bg-background focus:ring-morandi-gold` | 🟡 手刻 |
| 公告排程日期 | `<DatePicker>`（ui/date-picker） | date | 共用 | ✅ |

### 🔽 下拉 / 選擇 Select / ComboBox / Dropdown
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| ChannelMembersDialog 加入成員選人 | `<Combobox>` | 共用 | ✅ |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| （此頁無） | — | — |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| 訊息流（手刻 `<div>` map MessageBubble） | `space-y-3 px-3 py-4` | 無 | 無 | 「尚無訊息」`text-sm text-morandi-muted` 置中 | 🟡 對話流、非資料表 |
| ChannelMembersDialog 成員列表 | `<ul>` divide-y `px-3 py-2` | label | 無 | — | ✅ |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| 發送公告 | `EntityFormDialog` | 1 | 內建（立即發送/預排 + 取消） | ✅ |
| 頻道成員 | `FormDialog`（@/components/dialog） | 2 | 自刻 footer：`<Button variant="soft-gold">關閉` | ✅ |

### 🏷️ 狀態標籤 Badge / Status / Tag / Chip
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| 成員「owner」標 | 手刻 `<span>` + Crown icon | inline | morandi-gold | ✅ |
| 成員「（你）」 | 手刻 `<span>` | inline | morandi-muted | ✅ |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| 送出訊息 | Send | `h-4 w-4` | （按鈕內） |
| 撤回 | Trash2 | `h-3 w-3` | morandi-red |
| 成員數 / 加成員 | Users / UserPlus | `h-4 w-4` | morandi-gold / 按鈕 |
| 移除成員 | UserMinus | `h-4 w-4` | morandi-muted→morandi-red |
| owner | Crown | `h-3 w-3` | morandi-gold |
| 公告 | Megaphone | `h-4 w-4` | （按鈕） |
| loading | Loader2 | `h-4 w-4` / `h-5 w-5` | morandi-muted / 按鈕 |

### 🃏 卡片 / 容器 Card / Panel / Tabs / Accordion
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| 我的訊息泡泡 | 手刻 `<p>` | `rounded-2xl rounded-tr-sm` | 無 | bg `morandi-gold/20`（金、識別「自己」） |
| 對方訊息泡泡 | 手刻 `<p>` | `rounded-2xl rounded-tl-sm` | 無 | bg `morandi-container/60`（中性） |
| 已撤回訊息佔位 | 手刻 `<p>` italic | `rounded` | 無 | bg `morandi-container/40` |
| 系統訊息 | 手刻 `<p>` italic 置中 | — | — | morandi-muted |
| 頭像 | 手刻 `<div>`/`<img>` | `rounded-full` w-8 h-8 | 無 | bg `morandi-gold/20` |

### 🔔 回饋 Toast / 確認框 / 空狀態 / 載入 Loading / Skeleton
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 發 / 撤回 / 成員操作 | `sonner` toast | ✅ |
| 訊息載入 / channel 載入 | Loader2 spin | ✅ |
| 空訊息「尚無訊息」 | 手刻文字 | ✅ |
| 系統通知頻道唯讀提示 | 手刻底部條 `bg-morandi-container/40` | ✅ |

## 🔴 不統一 / 異常標記（重點、給最後彙整用）
- **撤回鈕（Trash2）+ 移除成員鈕（UserMinus）都用 `morandi-red`（美術色當危險色）、應走 `status-danger`** — 跟 ActionCell 黃金標準的 `text-status-danger hover:bg-status-danger-bg` 分岔（顏色軌分裂）
- 撤回 / 移除成員都是手刻 `<button>`、沒走 ActionCell（對話流 inline 操作、ActionCell 不支援、可接受但顏色該對齊）
- composer / textarea / time input 全手刻、非 `<Input>` 共用組件（token 正確、沉浸式可接受）
- 訊息泡泡圓角 `rounded-2xl` + 尖角 `rounded-tr-sm/tl-sm` 是 ChannelView 自定義 → 跟 `/ai` 的 MessageBubble 樣式**幾乎一致**（見三介面比對）但細節微差：channels 我方泡泡 `morandi-gold/20`，ai 我方 outbound 是 `bg-morandi-primary text-white`（不一致、見備註）

## 備註
- **三對話介面比對重點**：channels ChannelView 與 ai MessageBubble 都用 `rounded-2xl` + 頭像 `w-8 h-8 rounded-full bg-morandi-gold/20`、composer 樣式 W 5/19 明文拍板「兩邊統一」（`border-border bg-background focus:ring-morandi-gold` + Send/Loader2 + 送出鈕完全一致）✅
- **但泡泡配色不一致**：channels 我方=`morandi-gold/20`、對方=`morandi-container/60`；ai outbound 客服=`bg-morandi-primary text-white`、ai outbound AI=`morandi-gold/20`、inbound=`morandi-container/60`。即「自己發的訊息」channels 用金底、ai 用深色底白字 → **兩套對話 UI 我方泡泡配色分岔**
- channel type 分支多：system_notice（唯讀）/ announcement（發公告鈕）/ 一般（composer）；isBot / isDm 影響成員按鈕顯示
