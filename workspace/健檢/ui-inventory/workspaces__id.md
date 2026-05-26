# UI 盤點：`/workspaces/[id]`

> 掃描日期：2026-05-26 ｜ 來源檔：`src/app/(main)/workspaces/[id]/page.tsx`
> 主要 _components：`overview-tab.tsx`、`ai-settings-tab.tsx`、`ai-health-tab.tsx`、`billing-tab.tsx`、`addons-tab.tsx`、`llm-token-setup-dialog.tsx`、`integration-settings-dialog.tsx`、`QuotaHistorySection.tsx`
> 頁面類型：詳情（tab 容器、租戶詳情）

## 一句話用途
租戶詳情頁、5 個 tab：總覽（方案+功能+系統主管+配額+HR政策）、AI 模型（LLM token/行為/HAPPY人格）、AI 健康度（dashboard）、附加服務（加值）、費用紀錄（訂閱+付款）。

## Layout 骨架
- **頁面框架**：`ContentPageLayout`（title=租戶名、icon=Building2、breadcrumb、tabs、activeTab、primaryAction）
- **頁首**：標準標題 + 麵包屑（租戶管理 → 詳情）；tabs 列（LayoutDashboard/Sparkles/Activity/PackagePlus/Wallet）；primaryAction「儲存」僅在「總覽」+「附加服務」tab 顯示（AI/Billing tab 各自有獨立儲存）。
- **分頁**：無資料分頁；費用紀錄 / 配額為卡片列表非 table 分頁。
- ⚠️ 此頁 **大量自刻 `rounded-[24px]` 漸層卡片 + `shadow-[rgba(...)]` 硬編碼**，全程靠 `eslint-disable-next-line venturo/no-forbidden-classes` 壓制。

## UI 元素清單

### 🔘 按鈕 Buttons
| 位置/用途 | 用什麼組件 | variant | 尺寸 | 圖示 | 顏色 token | 對齊標準? |
|---|---|---|---|---|---|---|
| 頁首「儲存」（總覽/附加服務） | ContentPageLayout.primaryAction | (layout) | — | Save | btn-primary | ✅ |
| Overview 方案卡片 | 手刻 `<button>` rounded-[20px] | — | — | Check | morandi-gold/cream | 🔴 手刻卡片按鈕 + 硬編碼圓角/陰影 |
| Overview Advance 3選2 | 手刻 `<button>` rounded-[12px] | — | — | Check | morandi-gold | 🔴 手刻 |
| Overview「重設密碼」 | `<Button>` soft-gold + 額外 className | soft-gold | sm | — | morandi-gold | 🟡 加 `border-morandi-gold text-morandi-gold` 覆寫 |
| Overview「儲存 HR 政策」 | `<Button>` soft-gold + className | soft-gold | sm | — | morandi-gold | 🟡 同上覆寫 |
| AiSettings「設定 Token / 變更 Token」 | `<Button>` | (default) | sm | KeyRound | 🔴 `bg-morandi-gold hover:bg-morandi-gold/90 text-white` | 🔴 硬刻金底白字、未走 variant |
| AiSettings「移除設定」 | `<Button>` outline + className | outline | sm | Trash2 | 🔴 `text-red-600 hover:text-red-700` | 🔴 Tailwind 預設紅、應走 status-danger |
| AiSettings「儲存 AI 設定 / 儲存 HAPPY 人格」 | `<Button>` soft-gold + className | soft-gold | (default) | Save | morandi-gold | 🟡 className 覆寫 |
| Addons API 加值卡「設定」 | `<Button>` outline | outline | sm | Settings2 | — | ✅ |
| Billing「新增付款紀錄」 | `<Button>` soft-gold + className | soft-gold | sm | Plus | morandi-gold | 🟡 className 覆寫 |
| LlmTokenDialog wizard 上/下一步/取消/驗證/儲存 | `<Button>` outline/default | outline/default | (default) | Loader2 | 部分 `bg-morandi-gold text-white` + `animate-pulse` | 🔴 儲存鈕硬刻金底白字 |
| IntegrationDialog 取消/儲存 | `<Button>` ghost / soft-gold | ghost/soft-gold | sm | Save/Loader2 | — | ✅ |

### ⌨️ 輸入框 Input / Textarea
| 位置/用途 | 用什麼組件 | 類型 | 顏色/邊框 token | 對齊標準? |
|---|---|---|---|---|
| AiSettings prompt template / HAPPY 人格 | `<Textarea>` | text | 標準 | ✅ |
| Billing 金額/週期/付款日/備註 | `<Input>` / `<Textarea>` | number/date/text | 標準 | ✅ |
| LlmTokenDialog token（密碼+顯示切換）/ model | `<Input>` + 自刻眼睛 toggle button | password/text | 標準（model font-mono） | ✅（含 show/hide 眼睛、autoComplete off） |
| IntegrationDialog 動態欄位 | `<Input>` | text/password | 標準 | ✅ |

### 🔽 下拉 / 選擇 Select
| 位置/用途 | 用什麼組件 | 樣式 | 對齊標準? |
|---|---|---|---|
| AiSettings 回應語氣 | `<Select>`（ui/select） | 標準 | ✅ |
| Overview 特休制度 / 資遣費制度 | 原生 `<select>` | `h-10 px-3 rounded-md border border-morandi-border bg-white` | 🟡 原生 select 手刻、非共用 Select |
| Billing 狀態 | `<Select>`（ui/select） | 標準 | ✅ |
| LlmTokenDialog provider（step1 radio） | 原生 radio | — | 🟡 原生 radio |

### ☑️ 勾選 / 開關 Checkbox / Radio / Switch
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| Overview 方案內功能 toggle / 其他可選功能 toggle | `<Switch>` | ✅ |
| AiSettings data sources / HAPPY 啟用 | `<Checkbox>`（ui/checkbox） | ✅ |
| Addons 資料庫加值 / API 啟用 toggle | `<Switch>` | ✅ |
| IntegrationDialog 啟用 + checkbox 欄位 | `<Switch>` | ✅ |
| LlmTokenDialog provider 選擇 | 原生 radio | 🟡 原生 |

### 📋 表格 / 列表 Table / List
| 用什麼組件 | 行高/密度 | 表頭樣式 | 斑馬紋 | 空狀態 | 對齊標準? |
|---|---|---|---|---|---|
| QuotaHistorySection 配額紀錄 | 原生 `<table>` | morandi-secondary th | 無 | 「尚無配額變更紀錄」 | 🟡 原生 table 手刻、非 EnhancedTable |
| Billing 付款紀錄 | 自刻 grid-12 卡片列 | 無表頭（卡內標籤） | 無 | 「尚無付款紀錄」 | 🟡 自刻 grid 卡 + 硬編碼陰影 |

### 🪟 對話框 Dialog / Drawer / Popover
| 位置/用途 | 用什麼組件 | level | footer 按鈕樣式 | 對齊標準? |
|---|---|---|---|---|
| LLM Token 設定（4-step wizard） | `<Dialog>`+`<DialogContent>`（max-w-xl，**無 level**） | 🔴 未設 level | DialogFooter（outline + default/金底） | 🔴 缺 level；儲存鈕硬刻金底 |
| API 整合設定 | `<Dialog>`+`<DialogContent>`（max-w-xl，**無 level**） | 🔴 未設 level | DialogFooter（ghost + soft-gold） | 🔴 缺 level（CLAUDE.md 要求 Dialog 必設 level） |
| Billing 新增付款 | `<FormDialog>`（共用、maxWidth lg） | (FormDialog 內) | 共用 footer + loading | ✅ |
| 重設密碼/移除確認 | `alert()` / `confirm()` (window.confirm in AiSettings remove) | — | — | 🟡 AiSettings handleRemoveLlm 用原生 `window.confirm`、非 alert-dialog |

### 🏷️ 狀態標籤 Badge / Status
| 位置/用途 | 用什麼組件 | 形狀 | 顏色 token | 對齊標準? |
|---|---|---|---|---|
| Overview 狀態（啟用中/已停用） | `<Badge>` | rounded | 🔴 `bg-morandi-green/20 text-morandi-green`（啟用）/ morandi-secondary | 🔴 啟用用 morandi-green（美術色）做語意狀態 |
| Overview「使用中」方案標記 | inline span | rounded-full | morandi-gold | ✅（品牌標記） |
| AiSettings 啟用狀態「✅ 啟用中」 | inline span | text | 🔴 `text-green-700` | 🔴 Tailwind 預設綠 |
| AiSettings data sources「待 RAG 生效」 | inline span | rounded-full | 🔴 `border-amber-200 bg-amber-50 text-amber-700` | 🔴 Tailwind 預設 amber |
| Addons API「啟用中」 | `<Badge variant=outline>` | — | 🔴 `border-green-200 text-green-700 bg-green-50` | 🔴 Tailwind 預設綠 |
| Addons「已設定」/ addon code | `<Badge variant=outline>` | — | 標準/font-mono | ✅ |
| Billing 狀態（待繳/已繳清/逾期） | `<Badge>` + STATUS_BADGE_CLASS | — | 🔴 pending=morandi-gold；paid=morandi-green/20；overdue=`bg-red-100 text-red-700` | 🔴 paid 用 morandi-green、overdue 用 Tailwind 預設紅 |
| AiHealthTab StatCard/Metric highlight | 內建 | — | ✅ `status-danger`/`status-warning`/`status-success`-bg | ✅（AiHealth 是唯一正確走 status token 的 tab） |
| LlmTokenDialog 驗證結果框 | inline div | rounded | 🔴 `bg-green-50 text-green-800` / `bg-red-50 text-red-800` | 🔴 Tailwind 預設綠/紅 |
| LlmTokenDialog 完成勾 | CheckCircle2 | — | 🔴 `text-green-500` | 🔴 Tailwind 預設綠 |
| IntegrationDialog 必填 * | inline span | — | status-danger | ✅ |

### 🎨 圖示 Icons
| 動作/用途 | icon 名 | 尺寸寫法 | 顏色 token |
|---|---|---|---|
| tabs | LayoutDashboard/Sparkles/Activity/PackagePlus/Wallet | (tabs 內) | — |
| section header | Users/Cpu/KeyRound/Wallet/PackagePlus/Database/Plug/Bot 等 | h-4 w-4 / size-5 | morandi-gold | 🟡 尺寸寫法混用 `h-4 w-4` 與 `size-5`/`size-4` |
| 移除 LLM | Trash2 | h-3.5 w-3.5 | text-red-600 | 🔴 預設紅 |
| AiHealth 卡片 icon | MessageSquare/Activity/BrainCircuit/AlertCircle/Sparkles/Coins/BookOpenCheck | w-3.5/w-4 | morandi-gold/morandi-muted | ✅ |

### 🃏 卡片 / 容器 Card / Panel / Tabs
| 位置/用途 | 用什麼組件 | 圓角 token | 陰影 token | 對齊標準? |
|---|---|---|---|---|
| Overview/AiSettings/Billing/Addons 各大卡 | 自刻 `<div>` 或 `<Card>` | 🔴 `rounded-[24px]`/`[20px]`/`[16px]`/`[12px]` 硬編碼 | 🔴 `shadow-[rgba(180,160,120,0.15)...]` 硬編碼 | 🔴 全程硬編碼圓角/陰影、靠 eslint-disable 壓制 |
| AiHealthTab 卡 | `<Card>` border-border | (Card 預設) | (Card 預設) | ✅ |

### 🔔 回饋 Toast / 確認 / 空狀態 / Loading
| 位置/用途 | 用什麼組件 | 對齊標準? |
|---|---|---|
| 各儲存/錯誤 | sonner toast / alert-dialog | ✅ |
| tab 載入 | `<ModuleLoading/>` | ✅ |
| AiHealth 載入/失敗 | inline 文字（失敗用 status-danger） | ✅ |
| 移除 LLM 確認 | `window.confirm`（原生） | 🔴 原生 confirm、非 alert-dialog |
| 空狀態 | inline 文字 + Addons EmptyState helper | ✅ |

## 🔴 不統一 / 異常標記（重點）
- 🔴 **整頁硬編碼 `rounded-[24px]` + `shadow-[rgba(...)]` 卡片**：Overview / AiSettings / Billing / Addons / QuotaHistory 全部用自刻漸層卡，靠 `eslint-disable venturo/no-forbidden-classes` 大量壓制，未走 Card token，是此頁最大技術債。
- 🔴 **語意狀態色大量用美術色 / Tailwind 預設色**：啟用=morandi-green、`text-green-700`、`bg-green-50`、`border-amber-200`、`bg-red-100`、`text-red-600`、`text-green-500` 散落 Overview/AiSettings/Addons/Billing/LlmTokenDialog。唯獨 `AiHealthTab` 正確走 `status-*` token，可當此頁修正範本。
- 🔴 **兩個 Dialog 未設 `level`**（LlmTokenSetupDialog、IntegrationSettingsDialog），違反「Dialog 必設 level」紅線。
- 🔴 **按鈕硬刻金底白字**：`bg-morandi-gold text-white`（AiSettings 設定 Token、LlmTokenDialog 儲存），未走 default/soft-gold variant。
- 🟡 **原生 `<select>` 手刻**（Overview HR 政策特休/資遣費），非共用 Select。
- 🟡 **原生 `window.confirm`**（AiSettings 移除 LLM），非 `@/lib/ui/alert-dialog`。
- 🟡 **icon 尺寸寫法混用** `h-4 w-4` / `size-5` / `size-4` / `h-3.5 w-3.5`。
- 🟡 **soft-gold 按鈕又疊 `border-morandi-gold text-morandi-gold` className 覆寫**（重設密碼、HR政策、AI儲存），重複定義。

## 備註
- 此頁是全 7 頁中 UI 最不統一的，集中問題：自刻漸層卡 + 美術/預設色當語意色 + Dialog 缺 level。
- `AiHealthDashboard` 為雙受眾共用（tenant-admin 此頁 / customer AI Hub），是少數寫得乾淨的 component。
- 多個寫入走 `apiMutate`（features/plan/HR/billing/integration/llm），符合紅線 F；惟 HAPPY 人格儲存用原生 `fetch` PUT（未走 apiMutate）。
