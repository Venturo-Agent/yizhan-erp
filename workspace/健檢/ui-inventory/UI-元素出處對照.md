# 全站 UI 元素 × 出處對照（總表）

> 2026-05-26 ｜ 91 頁逐頁盤點彙整 ｜ 用途：給「全站 UI 統一」決策用
>
> **怎麼讀**：每個元素類型 → 有哪幾套做法/變體 → 各出現在哪些頁 → 標 ✅標準 / 🟡半對齊 / 🔴異常 → 建議統一成什麼。
>
> ⚠️ **大前提：全站不是一套 UI、是三套設計系統並存**
> 1. **桌面 ERP**（morandi 色、本表主要範圍）
> 2. **行動版 `/app`**（藍色深色、手刻 CSS、0 共用組件、另一套世界）
> 3. **對客頁**（提案 / 付款 / canvas，多套獨立 CIS，William 拍板的特例、暫不強制納管）
>
> **目錄**：① 按鈕 → ② 輸入框 / 下拉 / 勾選開關 → ③ 卡片 / 頁籤 / 表格 / 分頁 → ④ 對話框 / 狀態 Badge / 空狀態載入 → ⑤ 圖示

---

# UI 元素 × 出處彙整：按鈕 Button

> 共用組件基準：`src/components/ui/button.tsx`（5 variant）、列表操作欄 `src/components/table-cells/action-cells.tsx`（ActionCell）。

## 🔘 按鈕 Button

**A. 共用 `<Button>` 組件（5 種變體）**
| 變體 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `default` | 金色漸層、深棕字 | 各列表頁首「新增」鈕（/library/customers、/orders、/hr、/library/suppliers）、FormDialog 確認鈕 | ✅ |
| `destructive` | 紅底白字 | 刪除確認對話框 | ✅ |
| `soft-gold` | 淡金底、金字 | FormDialog 的「取消 / 儲存」 | ✅ |
| `outline` / `header-outline` | 描邊 / 描邊+陰影圓角 | 次要動作、頁首工具列 | ✅ |

**B. 列表行內操作按鈕 — 三套做法並存**
| 做法 | 出現在哪些頁 | 評 |
|---|---|---|
| `<ActionCell>`（標準） | /finance/payments、/library/customers、/accounting/vouchers、封存管理、/hr、/workspaces | ✅ 黃金標準 |
| 手套 `ACTION_BUTTON_BASE` 骨架常數 | /orders（simple-order-table）、/tours（TourActionButtons）、/library/attractions、/library/suppliers、/accounting/checks、/accounting/accounts、/settings/company（分公司）、/finance/treasury/disbursement、/marketing/website、/hr/bonus-settlement | 🟡 視覺像、沒走組件 |
| 純手刻 `<button>` | /accounting/accounts（科目表展開鈕）、/dashboard（便條紙 inline SVG 手畫 +/X） | 🔴 完全脫離 |

**C. 🔴 主操作鈕「手寫色」蓋掉 variant**
| 寫法 | 出現在哪些頁 | 評 |
|---|---|---|
| `bg-morandi-gold text-white` 蓋掉 default 金漸層 | /hr（EmployeeForm 提交鈕）、/finance/requests（footer 儲存）、/workspaces/[id]（LLM token 設定儲存）、/workspaces（新增） | 🔴 |

**D. 🔴 認證頁各自手刻三套**
| 寫法 | 出現在哪些頁 | 評 |
|---|---|---|
| inline `<style>` 自刻按鈕 | /login（`.login-button` 金漸層）、/change-password（`.cp-button` 純金）、/reset-password（`.reset-button` 雙色漸層） | 🔴 三套配方 |

**E. 🔴 行動版完全另一套**
| 寫法 | 出現在哪些頁 | 評 |
|---|---|---|
| `.app-*` 手刻 class、藍色系、0 共用組件 | /app、/app/dashboard、/app/settings 等全部 | 🔴 |

→ **建議統一**：主/次按鈕一律走 `<Button>` 對應 variant（禁手寫 `bg-morandi-gold` 蓋色）；列表操作欄一律走 `<ActionCell>`（擴充支援 active 高亮 + brand 金色，讓 orders/tours 能遷移）；認證頁 + 行動版的手刻按鈕收斂到共用 `<Button>`。


---

# UI 元素 × 出處彙整：表單元件（輸入框 / 下拉 / 勾選開關）

> 彙整日期：2026-05-26 ｜ 範圍：91 個 `ui-inventory/*.md` 逐頁盤點 + `rg` 回查 `src/app`、`src/components` 補實。
> 負責 3 類：① 輸入框 Input/Textarea ② 下拉 Select/Combobox ③ 勾選開關 Checkbox/Radio/Switch。
> 評級：✅ 標準（走共用組件 + morandi token） / 🟡 半對齊（組件對但樣式手刻、或手刻但 token 正確） / 🔴 異常（原生 HTML 控件或 Tailwind 預設色 / 未定義 token）。

---

## ⌨️ 輸入框 Input / Textarea

共用組件基準：`src/components/ui/input.tsx`（97 個檔 import）、`src/components/ui/textarea.tsx`。
特殊：`calc-input.tsx`（Excel 算式引擎）、`date-picker.tsx` / `date-input.tsx`、`time-input.tsx`、`input-ime.tsx`。
備註：共用 `<Input>` 本身已內建數學算式計算（`enableMathCalculation`、number/text 預設開）、所以金額/數字欄位**不需要另刻**。

**A. 共用 `<Input>` / `<Textarea>` 標準**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Input>` 文字/數字/email | morandi 邊框、focus 金環、內建算式 | /accounting/accounts、/accounting/checks、/accounting/vouchers、/hr（員工基本/薪資）、/hr/roles、/library/suppliers、/library/attractions、/marketing/website/[code]、/settings/company、/workspaces、/workspaces/[id]、/shared-data/airports·banks·countries（搜尋框）、/tours、/tours/[code] 等 30+ 處 | ✅ |
| `<Textarea>` 多行 | rows 標準、morandi 邊框 | /accounting/accounts·checks·vouchers、/library/suppliers（rows=3）、/marketing/website/[code]（rows=10/3）、/settings/company、/workspaces/[id]（AI prompt） | ✅ |
| `ListPageLayout` / `ContentPageLayout` 內建搜尋框 | 框架內建 search input | /finance/payments、/finance/requests、/finance/treasury/disbursement、/library/customers、/library/suppliers、/library/attractions、/marketing/website、/orders、/tours（ResponsiveHeader） | ✅ |

**B. 特殊算式 / 日期 / 時間輸入（共用但專用組件）**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<CalcInput>` Excel 算式金額 | 平時顯示結果、點擊顯示原公式、Enter/失焦計算 | /orders/_quotes（AccommodationItemRow、CostItemRow、QuickQuoteItemsTable）、/orders（CreateInvoicesDialog、NewInvoiceForm）、/finance/requests（RequestItemList） 共 6 處 | ✅ 金額專用、標出 |
| `<DatePicker>` / `<DateInput>` | morandi 風日期選擇 | /accounting/checks·opening-balances·vouchers、/accounting/reports/*（4 報表）、/calendar、/channels/[id]（排程）、/finance/reports·requests、/hr/bonus-settlement | ✅ |
| `<Input>` h-8 行內金額（表格內） | text-right font-mono | /accounting/opening-balances、/accounting/vouchers（借/貸方每列） | ✅ |

**C. 🟡 手刻 `<textarea>` / `<input>`（token 正確、但未走共用組件）**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 沉浸式聊天 composer 手刻 textarea | `border-border bg-background focus:ring-morandi-gold`、rows=1 自動長高、Enter 送 | /channels/[id]（訊息 composer + 公告 rows=6 + `<input type=time>`）、/ai（ReplyComposer rows=1） | 🟡 W 5/19 明文「composer 與 channels 統一」、token 對但仍手刻 |
| dashboard widget 手刻 input/textarea | 計算機算式 input（透明底 mono）、便條紙 textarea（`border-border/60`）、分頁改名 input（`border-morandi-gold/30`） | /dashboard | 🟡 widget 內輸入、非表單 |
| /calendar 新增事項手刻 input/textarea | `inputClassName`：`border-morandi-container bg-card`、**focus ring hardcode `#B8A99A`** | /calendar（標題 / 開始時間 / 說明） | 🟡 原生 + focus 色 hardcode hex（非 token） |
| /public/contract/sign 手刻 input | 三欄一致 `border-morandi-muted rounded-lg focus:ring-morandi-gold` | /public/contract/sign/[code]（電話 / 地址 / 身分證） | 🟡 彼此一致但未抽共用 Input |

**D. 🔴 手刻 `<input>` + 自刻 token（shadcn 預設色 / 未定義 token / hardcode hex）**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 手刻 textarea 用 shadcn 預設 token | `border-input bg-background focus:ring-ring`（非 morandi） | /ai（RetroEntry notes、SpeedCardEditor JSON font-mono） | 🔴 用 `border-input`/`ring-ring`、非 morandi token |
| 手刻 input 用未定義 token | `border-morandi-gray-300`（**全站未定義此 token**）+ hardcode white | /visas（對話框「備註」textarea） | 🔴 原生 + 不存在的 token |
| 認證頁 inline `<style>` 自刻 input | `.cp-input`：`border 2px var(--morandi-cream)` focus `morandi-gold` | /change-password（新密碼 ×2） | 🔴 inline style 自刻 |
| 認證頁 inline `<style>` 自刻、**色 hardcode** | `.reset-input`：`color:#333`、placeholder `#aaa`（跟 change-password 用 token 不一致） | /reset-password（新密碼 ×2） | 🔴 同類認證頁兩套寫法 |
| 登入頁 inline `<style>` 自刻 input | `.login-input`：白底柔陰影 focus 金邊 | /login（公司代碼/Email/密碼/忘記密碼）、/app（行動版登入、藍 focus `--app-accent`） | 🔴 原生、桌機/行動兩套 |
| 付款公開頁手刻 input/textarea | `border-border` focus morandi-gold / morandi-gold 底線 | /pay/[token]（金額 number / 識別碼 / 匯款日 date / 備註）、/pay/mock/[token]（卡號/期限/CVV/持卡人 font-mono） | 🔴 全手刻 |
| 動態欄位手刻 input | `border-border rounded-lg` focus morandi-gold | /setup/[token]（text/password/url 動態欄位） | 🔴 手刻 |

**E. 🟡 共用 Input 但 error 邊框用 Tailwind 預設色 / 美術色**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Input>` error 態用 `border-red-500` | 共用組件但驗證紅框走 Tailwind 預設色 | /p/tour/[code]/register（姓名 / Email / 報名人數） | 🟡 應走 `border-status-danger` |
| `<Input>` error 態用 `border-morandi-red` | 共用組件但紅框走美術色非語意色 | /workspaces（CreateDialog 代號/統編） | 🔴 應走 `border-status-danger`（顏色軌分岔） |

→ **建議統一**：所有單行/多行輸入一律走共用 `<Input>` / `<Textarea>`（金額用 `<CalcInput>`、日期用 `<DatePicker>`）；認證頁（login/app/change-password/reset-password）+ 公開頁（pay/setup/contract）的手刻 input 全部收斂到 `<Input>`，淘汰 inline `<style>` 與 hardcode hex；error 邊框統一 `border-status-danger`、禁 `border-red-500` / `border-morandi-red`；`/ai` 與 `/visas` 的 shadcn 預設 token（`ring-ring`、`border-input`）與未定義 token（`morandi-gray-300`）改 morandi token。

---

## 🔽 下拉 / 選擇 Select / ComboBox / Dropdown

共用組件基準：`src/components/ui/select.tsx`（shadcn radix、41 檔 import、trigger `h-10 border-input bg-card focus:border-morandi-gold`）、`combobox.tsx`（可搜尋、24 檔）、`bank-combobox.tsx`、`dropdown-menu.tsx`。

**A. 共用 `<Select>`（shadcn radix）標準**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Select>` 標準下拉 | SelectTrigger/Content/Item、morandi token | /accounting/accounts（科目類型/父科目）、/accounting/period-closing（4 個）、/accounting/reports/general-ledger（科目）、/accounting/vouchers（狀態/單據類型/科目 h-8）、/finance/payments·requests（狀態 w-32）、/shared-data/airports（國家 w-40）、/todos（優先級/負責人）、/tours/[code]（支出類別/供應商）、/workspaces/[id]（AI 語氣/Billing 狀態） | ✅ |

**B. 共用 `<Combobox>` / `<BankCombobox>`（可搜尋下拉）標準**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Combobox>` 可搜尋 + 清除 | 內建搜尋 input、ComboboxOption[]、disablePortal | /bot/[lineUserId]（選客戶）、/channels（綁團/私訊）、/channels/[id]（加成員）、/library/attractions（國家/分類篩選）、/finance/payments·requests（團號/訂單/供應商）、/tours（建團國家/城市） 共 24 檔 | ✅ |
| `<BankCombobox>` 銀行專用 | 共用、disablePortal | /library/suppliers、/settings/company、/finance/settings（BankAccountsSection）、/hr（薪資銀行代碼 SalarySection） | ✅ |

**C. 共用 `<DropdownMenu>`（動作選單、非表單選值）**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<DropdownMenu>` shadcn | align end/start、item 帶 lucide icon | /tours（頁首「新增專案」選單）、/orders（OrderStatusBadge 狀態變更、🔴 badge 用 Tailwind 預設色見 badge 報告） | ✅（選單本身）/🔴（orders badge 配色另計） |

**D. 🔴 原生 `<select>`（手刻 className、未走共用 Select）— 共 16 檔**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 原生 `<select>` 手刻邊框 | `h-10 border-input/border-morandi-border bg-background/bg-white rounded-md` 手寫 | /finance/settings（種類/科目/類型 — CategoriesSection、MethodDialog）、/hr（職務/分公司 BasicInfoSection、資遣費/特休 SeveranceCalculatorDialog）、/settings/company（出帳日期/差額入帳 CompanyInfoCard）、/workspaces/[id]（特休/資遣費 overview-tab）、/visas（狀態/客戶證件/服務類型 — 且 option 空 TODO）、/pay/[token]（收款方式 PayFormDialog） | 🔴 |
| 原生 `<select>`（orders 子表單） | 手刻、inventory 標「待確認」、rg 證實為原生 | /orders（BatchCustomerMatchDialog、NewContractForm、PnrMatchDialog.table/.stats、member-row/MemberBasicInfo、member-edit/MemberInfoForm）、/finance/payments（PaymentItemRow） | 🔴 |

**E. 🟡 共用 Select 但 trigger 被覆寫 / 缺一致性**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Select>` 但 trigger 硬塞 inputClassName | 組件對、樣式被覆寫 | /calendar（事件類型） | 🟡 |
| 同類頁缺篩選下拉（不一致） | airports 有國家 Select、countries 只能打字搜尋 | /shared-data/countries（vs airports） | 🟡 一致性缺口 |

→ **建議統一**：所有下拉選值一律走 `<Select>`（單選靜態）或 `<Combobox>`（可搜尋/長清單）；**16 個原生 `<select>` 全數收斂**（重災區 = orders 系列 + finance/settings + hr 員工表單 + visas + pay）；/calendar 移除 trigger 覆寫的 inputClassName；shared-data 各頁篩選器補齊一致。

---

## ☑️ 勾選 / 開關 Checkbox / Radio / Switch / Toggle

共用組件基準：`checkbox.tsx`（14 檔）、`switch.tsx`（17 檔）。**Radio 全站無共用組件**（無 RadioGroup）、一律原生。

**A. 共用 `<Switch>`（shadcn）標準**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Switch>` 啟用/上架/功能 toggle | morandi 風滑塊 | /accounting/accounts（啟用）、/ai（自動回覆 BusinessPanel）、/library/attractions（國家啟用 RegionsTab）、/marketing/website（官網上架）、/settings/company（集團出帳 + 旅行屬性）、/workspaces/[id]（方案功能/Addons/Integration）、/finance/settings（啟用/客戶收款 列上） | ✅ |

**B. 共用 `<Checkbox>`（shadcn）標準**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Checkbox>` 多選/全選 | morandi 勾選框 | /dashboard（widget 設定勾選）、/hr/bonus-settlement（全選 + 每團）、/hr/salary-settlement（員工排除）、/library/attractions（AttractionForm）、/workspaces/[id]（AI data sources / HAPPY） | ✅ |

**C. 🔴 原生 `<input type=checkbox>`（未走共用 Checkbox）— 共 24 檔**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 原生 checkbox `w-4 h-4` | 手刻 | /hr（薪資勞保/健保投保 SalarySection）、/finance/settings（設為預設/可出帳/客戶開放 — MethodDialog、BankAccountsSection）、/settings/company（分公司「設為預設」BranchesSection）、/dashboard（計算機「順序計算」calculator-widget）、/setup/[token]（動態欄位 type=checkbox）、/workspaces（分公司 TenantOrgSection） | 🔴 |
| 原生 checkbox + hardcode 色 | `accentColor: COPPER`（銅）/ `accent morandi-gold` | /tours/[code]/display-editor（AiAssistDialog 建議項）、/pay/[token]（團員「勾選要付」MemberRow）、/app（行動版「記住組織代碼」藍 accent `--app-accent`） | 🔴 原生 + hardcode 識別色 |
| 原生 checkbox（編輯器/工具卡片） | 卡片選取勾選 | /tours（itinerary DayRowAccommodation、itinerary-editor TimelineEditor/DailyScheduleEditor、tour-edit-dialog、TourPrintDialog/TourPrintMemberList）、editor（AttractionCard/HotelCard/RestaurantCard、tour-form DayCard/FlightSegmentCard）、/todos（PnrToolDialog）、/finance/requests（CostTransferDialog）、layout（PersonalSettingsDialog） | 🔴 |

**D. 🟡/🔴 原生 `<input type=radio>`（全站無共用 RadioGroup）— 共 4 檔**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 原生 radio 卡片 + accent token | `accent-morandi-gold` / `accent-[var(--morandi-gold)]`、auto-save | /settings/company（匯款手續費模式、獎金計算順序 BonusPolicySection、CompanyInfoCard） | 🟡 token 對但原生、無共用組件 |
| 原生 radio（二選一/步驟選擇） | `h-4 w-4` | /library/suppliers（臺灣國內/國外 SuppliersDialog）、/workspaces/[id]（LLM provider step1 llm-token-setup-dialog） | 🔴 原生 radio |

**E. ⚠️ 共用 Switch 但開色用美術色當語意色**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Switch>` + `data-[state=checked]:bg-morandi-green/gold` | 可讀取用綠、可寫入用金、+ 手刻「部分開啟」小圓點 | /hr/roles（模組層/分頁層 可讀取/可寫入 toggle） | ⚠️ 美術色當語意色、手刻裝飾點 |

→ **建議統一**：所有勾選一律走共用 `<Checkbox>`（**24 個原生 checkbox 全數收斂**、重災區 = tours 編輯器系列 + finance/settings + hr 員工表單 + 各公開/setup 頁）；**新建共用 `<RadioGroup>` 組件**收掉 4 處原生 radio（目前全站無此組件、是缺口）；開關 toggle 一律 `<Switch>`；/hr/roles 的「綠=讀、金=寫」語意化色建議走 status token 或明確定義為語意色、移除手刻圓點；公開頁/行動頁的 hardcode accent 色（COPPER / `--app-accent` 藍 / morandi-gold）改走共用組件預設色。

---

## 三類最關鍵不統一（給拍板）

1. **輸入框**：認證頁（/login、/app、/change-password、/reset-password）+ 公開收款頁（/pay/[token]、/pay/mock、/setup/[token]、/public/contract/sign）全是 inline `<style>` / 手刻 `<input>`，還夾 hardcode hex（`#B8A99A`、`#333`）和未定義 token（`morandi-gray-300`、shadcn `ring-ring`）——共用 `<Input>` 已內建算式與 morandi token，這批應全部收斂。

2. **下拉**：16 個原生 `<select>` 散在 orders 全家（6 檔）、finance/settings、hr 員工表單、visas、pay——跟共用 `<Select>` 視覺對不上（手刻 `h-10 border-input`），且 visas 還有 option 空白的 TODO 未完成。

3. **勾選/開關**：24 個原生 `<input type=checkbox>`（tours 編輯器系列 + finance/settings 對話框 + hr 薪資 + 公開頁）未走共用 `<Checkbox>`，部分還 hardcode 銅色/藍色 accent；更根本的缺口是**全站沒有共用 RadioGroup 組件**，4 處 radio 全靠原生手刻。


---

# UI 元素 × 出處彙整：容器結構（卡片 / 頁籤 / 表格 / 分頁）

> 來源：`workspace/健檢/ui-inventory/` 91 個逐頁盤點 md 萃取 + `rg` 回查 `src/app`/`src/components` 補證。
> 範圍：4 類容器/結構元素 — 🃏 卡片/Panel、📑 頁籤 Tabs、📊 表格/列表、🔢 分頁、外加散落的「空狀態/載入」。
> 評級：✅ 標準（走共用組件/token）｜🟡 半對齊（手刻但 token 對、或屬合理特例）｜🔴 異常（應走共用卻沒走、或硬編碼/預設色）
> 路由標示用盤點檔名對應（`accounting__checks` = `/accounting/checks`、`p__samui-proposal__code` = `/p/[samui-proposal]/[code]` 對客頁）。

---

## 📊 表格 / 列表 Table / List

全站列表有「黃金標準共用組件」`EnhancedTable`（預設 `initialPageSize=15`、內建表頭/斑馬紋/空狀態/分頁，`src/components/ui/enhanced-table/`），但實際散成 **5 種做法**。

**A. ✅ 共用 EnhancedTable（經 ListPageLayout 或直用）**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `ListPageLayout`+`EnhancedTable` 或直接 `<EnhancedTable>` | 統一行高/表頭/斑馬紋/空狀態，分頁固定 15 筆 | `/orders`、`/tours`、`/finance/payments`、`/finance/requests`、`/finance/treasury/disbursement`、`/hr`、`/hr/salary-settlement`、`/hr/bonus-settlement`、`/library/customers`、`/library/suppliers`、`/library/attractions`、`/library/archive-management`、`/accounting/accounts`、`/accounting/checks`、`/accounting/vouchers`（列表）、`/marketing/website`、`/workspaces`、`/visas` 等 20+ 處 | ✅ 主流、是該對齊的標準 |

**B. 🔴 手刻 `<table>`（master 表，三套表頭/行高互不對齊）**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 手刻 `<table>` 包 `rounded-md border` | 表頭 `bg-muted/50`、行高 `py-2`、無斑馬紋、空狀態放 table 內 colSpan row | `shared-data/banks`、`shared-data/countries`（兩頁複製貼上、僅欄位差） | 🔴 非 EnhancedTable |
| 手刻 `<table>` 分組卡牆 | 表頭 `bg-muted/30 text-xs`、行高 `py-1.5`、每國家一張小 table、空狀態放 table 外 div | `shared-data/airports` | 🔴 與 banks/countries 行高+表頭+空狀態位置全不一致 |
| 手刻 `<table>` 包 `<Card>` | 表頭 `bg-morandi-container/30 text-xs`、行高 `py-3`、有 breadcrumb+Tab+Badge+toast | `shared-data/insurance-grades` | 🔴 同模組「異類」，跟前三頁幾乎零共通點 |

> **master 表四頁三套表頭背景並存**：`bg-muted/50`（banks/countries）、`bg-muted/30`（airports）、`bg-morandi-container/30`（insurance-grades）。行高三種：`py-1.5`/`py-2`/`py-3`。空狀態兩流派（table 內 colSpan vs table 外 div vs `<Card>`）。

**C. 🟡 手刻 `<table>`（會計/財務報表，報表性質可接受但同模組兩流派）**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 手刻 `<table>` + `bg-morandi-container` 表頭 | px-4 py-3、hover 高亮、含累計/總計行 | `accounting/reports/general-ledger`、`accounting/reports/trial-balance` | 🟡 報表用 table |
| `flex justify-between` 明細列（非 table） | 用 Card 標題分組、無表頭 | `accounting/reports/balance-sheet`、`accounting/reports/income-statement` | 🟡 報表用 flex |
| 手刻 `<table>` 自刻 td/th | py-2.5 px-4、border-b | `/finance/reports`（OverviewSupplierTable、TourPnlTab） | 🟡 同頁混 EnhancedTable + 手刻 table |
| 手刻 `<table>` colgroup | header 列 `bg-morandi-green/10` 綠底（美術色當「收款」語意）、含總計行 | `/tours/[code]`（tour-receipts 收款總覽、PaymentRequestOverviewTable 請款總覽） | 🔴 綠色表頭 |

> **會計報表同模組兩排版法**：general-ledger/trial-balance 用 `<table>`，balance-sheet/income-statement 用 `flex` — 同一組報表兩種骨架。

**D. 🟡 手刻 `<table>`（唯讀子表/明細，可接受但無空狀態）**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 手刻 `<table>` 唯讀明細 | 表頭 `bg-morandi-container/30~/50 text-xs`、border-t 分行、常缺空狀態 | `/hr`（調薪紀錄）、`/hr/salary-settlement/[id]`（薪資明細+tfoot 合計）、`/hr/bonus-settlement/[tourId]`（員工明細）、`/accounting/vouchers`（分錄表）、`/workspaces/[id]`（QuotaHistorySection 配額紀錄）、`public/contract/sign/[code]`（團員名單/行程附件）、`settings/company`（用 shared-table） | 🟡 子表性質、可接受 |
| `shared-table`（設定頁專用 Table 組件） | 5 張設定卡共用同一份 shared-table（放 Card 內） | `/finance/settings`（銀行/收款/付款/類別等卡） | 🟡 非 EnhancedTable 但 5 卡統一 |

**E. 🔴 自刻清單/卡片列（行動版 + 沉浸式 + 看板，非資料表）**
| 做法 | 長相/寫法 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 自刻 `.app-*` 卡片堆/選單列 | hardcode 圓角、藍主色、不吃桌面 token | `/app/dashboard`、`/app/more`（行動版） | 🔴 整套分岔 |
| 沉浸式對話流/導覽 `<ul>/<li>`/MessageBubble | py-1.5~2、無表頭、性質非資料表 | `/ai`、`/channels`、`/channels/[id]` | 🟡 對話/導覽合理 |
| 看板欄位 + 卡片 | KanbanColumn + TodoCard，無 table | `/todos` | N/A 看板形態 |
| 對客頁時間軸/卡片 grid | inline style、獨立 CIS | `/p/tour/[code]/canvas`、`/p/[*]-proposal/[code]`、`/p/canvas-demo` | 🟡 對客獨立 CIS |

→ **建議統一**：ERP 內部列表一律走 `EnhancedTable`。最該收的是 **shared-data 四頁手刻 master table**（banks/countries/airports/insurance-grades，三套表頭+行高，banks↔countries 還是複製貼上）。會計報表/唯讀子表/對客頁/看板屬合理特例可保留，但唯讀子表應補空狀態。

---

## 🃏 卡片 / 容器 Card / Panel

有共用 `<Card>` 組件（`@/components/ui/card`，內建圓角/陰影/border token），但散成 **5 種做法**。

**A. ✅ 共用 `<Card>` 組件**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Card>` 走內建 token | rounded/shadow/border 全內建 | `/accounting/opening-balances`、`/accounting/period-closing`、所有 `accounting/reports/*`、`/hr/salary-settlement/[id]`、`/hr/bonus-settlement/[tourId]`、`/library/customers/[id]`、`/marketing/website/[code]`、`/no-access`、`/settings/company`、`/websites/products`、`/workspaces`（CreateDialog） | ✅ |

**B. 🟡 手刻 `<div>` 但走 token（rounded-lg/xl + bg-card/border + shadow token）**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 手刻 `<div bg-card border rounded-lg/xl shadow-sm>` | token 對、組件不對 | `/calendar`（控制群組+主體）、`/hr/roles`（左右兩面板）、`/hr`（EmployeeForm 外殼）、`/todos`（看板欄位/卡片）、`/library`（模組導覽卡）、`/shared-data`（導航卡）、`/p/tour/[code]/register`、`pay/*`、`setup/[token]`、`public/contract/sign/[code]` | 🟡 token 對、未用 `<Card>` |

**C. 🔴 入口卡牆（多頁重複的 icon+title+描述 Link/Card pattern，可抽未抽）**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 卡片 grid + `<Card> hover:shadow-lg` + icon 底色塊 | 結構幾乎相同（icon/title/description/color/bg） | `/accounting`（6 入口）、`/accounting/reports`（4 入口）、`/finance`（功能模組導航卡）、`/library`、`/shared-data` | 🟡 跨頁可抽共用入口卡組件 |

> `/accounting/reports` 的 `reports[]` 與 `/accounting` 首頁 `quickLinks[]` 結構完全一致（盤點明指）。

**D. 🔴 硬編碼圓角/陰影漸層卡（靠 eslint-disable 壓制）**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `rounded-[40px]` + inline `shadow-[rgba(180,160,120,0.45)...]` claymorphism | 已掛 `eslint-disable venturo/no-forbidden-classes` | `/login`、`/change-password`、`/reset-password` | 🔴 hardcode（刻意風格） |
| `rounded-[24/20/16/12px]` + `shadow-[rgba(180,160,120,0.15)...]` 漸層卡 | 用 `n` 自訂圓角 utility 替代、`bg-gradient-to-t from-white to-morandi-cream border-[3px]` | `/workspaces/[id]`（overview-tab / billing-tab / ai-settings-tab / addons-tab / QuotaHistorySection 全部）、`/workspaces`（TenantPlanSection） | 🔴 全頁硬編碼、此頁最大技術債（rg 證實 6 檔散落） |

**E. 🔴 統計卡手刻 div（非 Card、含美術色染底）**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 手刻 `<div bg-xxx/10 rounded-lg>` 當統計卡 | 逾期/危險用 `bg-morandi-red/10`（美術色當語意）、收入/支出用 `bg-morandi-green/10`、`bg-morandi-red/10` | `/accounting/checks`（3 張統計卡）、`/finance`（4 張收支總覽卡）、`/finance/reports`（OverviewStatCards） | 🔴 手刻 div + 美術色染底 |
| ✅ 對照組：`/finance/reports` 的 `ReportStatCard`（2026-05-23 已收斂成單一份共用統計卡） | `<Card>`+`CardContent` hover:border-morandi-gold/40 | `/finance/reports`（5 分頁共用） | ✅ 好範例 |

**F. 🟡 對客頁/沉浸式手刻卡（inline style 或 bg-white 硬寫）**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 訊息泡泡 `rounded-2xl rounded-tr/tl-sm` | 手刻 | `/ai`、`/channels`、`/channels/[id]`（我方/對方/系統三色泡泡） | 🟡 沉浸式 |
| modal 殼 `bg-white` 硬寫底色 | 非 `bg-card`/`bg-background` token、dark mode 會破 | `/ai`（RetroModal/SpeedCardEditor/RetroEntry 卡） | 🔴 bg-white 硬寫 |
| 對客頁 inline hex 卡 | `#FAF8F5`/`#1a1a1a` 等硬編、editorial/luxury 風 | `/p/*-proposal/[code]`、`/p/tour/[code]/canvas`、`/p/canvas-demo`、`/tours/[code]/display-editor`（Canvas 主題 `#2D1F18`/`#C85A38`） | 🟡 刻意獨立 CIS、待拍板是否納管 |

→ **建議統一**：ERP 內部容器一律走 `<Card>` 組件。最該收的是 **`/workspaces/[id]` 整頁硬編碼 `rounded-[24px]`+rgba 陰影漸層卡**（6 個 _components 檔散落、靠 eslint-disable 壓，盤點列為此頁最大債）。其次「入口卡牆」（accounting/finance/library/shared-data）抽一個共用 EntryCard 組件。統計卡改走 `ReportStatCard` 那種共用卡 + status token 染底。對客 CIS（canvas/proposal/display-editor）屬 William 拍板的獨立設計域，待拍板是否納管。

---

## 📑 頁籤 Tabs

有共用 `ContentPageLayout` 的 `tabs` prop（路由級子導航）與 shadcn `<Tabs>`（`src/components/ui/tabs.tsx`，內容級切換）兩套，做法分 **4 種**。

**A. ✅ ContentPageLayout/ListPageLayout 內建 tabs（路由級子導航）**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 框架 `tabs`/`statusTabs` prop | 統一樣式、切 tab 同步 URL | `/orders`、`/tours`、`/finance/reports`、`/finance/settings`（6 分頁）、`/hr`、`/hr/roles`、`/library/attractions`、`/library/customers/[id]`、`/accounting/accounts`（statusTabs）、`/shared-data/insurance-grades`、`/workspaces/[id]`、`/tours/[code]`（6 主 tab） | ✅ |

**B. 🟡 雙層 Tabs（ContentPageLayout tabs + shadcn Tabs 並存、需手動同步 activeTab）**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 外層框架 tabs + 內層 shadcn `<Tabs>` 同步 | 略冗、兩套狀態手動對齊 | `/library/customers/[id]`、`/library/attractions`、`/finance/reports` | 🟡 雙層同步、可簡化 |

**C. ✅ shadcn `<Tabs>`（對話框內容切換）**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Tabs>/<TabsList>/<TabsTrigger>/<TabsContent>` | 對話框內團體/批量/公司切換 | `/finance/payments`、`/finance/requests`（收款/請款對話框內） | ✅ |

**D. 🔴 手刻 tab（button + 底線高亮，非組件）**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 手刻 `<button>` tab 列 | 自刻底線/高亮 | `settings/company`（SettingsTabs 手刻、目前剩 1 tab）、`/tours/[code]`（舊版 `_TourTabs` `border-primary text-primary`、dead-ish 未使用）、`/ai`（設定 dialog tab 手刻 button `rounded-md`） | 🔴/🟡 手刻、`_TourTabs` 疑似 dead code |

→ **建議統一**：路由級子導航走 `ContentPageLayout` tabs、內容級切換走 shadcn `<Tabs>`。手刻 tab（`settings/company` 的 SettingsTabs、`/ai` 設定 dialog tab）改走 shadcn Tabs。`/tours/[code]` 的 `_TourTabs` 確認是 dead code 應走刪除驗證流程清掉。雙層 Tabs（customers/[id]、attractions、finance/reports）評估能否收成單層。

---

## 🔢 分頁 Pagination

**A. ✅ EnhancedTable 內建分頁（固定 15 筆，符合效能紅線）**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `serverPagination`（server-side、15 筆/頁） | 不給每頁筆數選擇器 | `/finance/payments`、`/finance/requests`（明標 15 筆）、`/orders`（PAGE_SIZE=15）、`/tours`、`/library/customers`、`/library/suppliers` | ✅ 符合「分頁固定 15 筆」紅線 |
| `initialPageSize={15}` client 分頁 | EnhancedTable 預設值=15（rg 證實 `useTableState`/`EnhancedTable` default 15） | `/library/attractions`、`/hr`、`/hr/salary-settlement`、`/hr/bonus-settlement`、`/workspaces`、`/marketing/website`（client、未傳 serverPagination） | ✅/🟡 client 端分頁 |

**B. 🔴 自刻分頁列**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 手刻兩顆 `<Button>` 上一頁/下一頁 + 文字摘要 | 用 default 金漸層主 CTA 樣式（語意過重） | `/finance`（交易紀錄） | 🔴 非制式組件、分頁鈕不該用主 CTA 樣式 |

**C. 🔴 無分頁但全量 render（效能隱憂）**
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| EnhancedTable 不傳 serverPagination、全量 render | 違反「列表分頁固定 15 筆」效能紅線 | `/visas`（全量 `mappedApplications`）、`/library/archive-management`（一次撈 `archived=true` 全部）、`/finance/treasury/disbursement`（`{ all: true }` 全撈）、`/shared-data/*`（一次撈全表/6000+ 筆） | 🔴 無分頁、量大時效能炸 |

**D. N/A 無分頁（性質不需要）**
| 做法 | 出現在哪些頁 | 評 |
|---|---|---|
| 樹狀/報表/看板/對話流/詳情/設定 一次載全部 | `/accounting/accounts`（科目樹）、`accounting/reports/*`、`/todos`（看板）、`/ai`、`/channels`、`/calendar`、各詳情頁 | N/A |

→ **建議統一**：所有資料量會成長的列表一律走 `EnhancedTable` 的 `serverPagination`（固定 15 筆，符合效能紅線「不給每頁筆數選擇器」）。最該收的是 **`/visas`（全量 render）** 與 **`shared-data` 四頁（一次撈全表，airports 6000+ 筆）**。`/finance` 的自刻分頁列改走 EnhancedTable 內建分頁。

---

## 🔄 空狀態 / 載入 Loading（散落、附帶記錄）

跨頁最碎的一塊：有共用 `<Spinner>`/`<ModuleLoading>`/`<ModuleError>`/EnhancedTable 內建 emptyState，但大量頁面自刻。

**載入 Loading**
| 做法 | 出現在哪些頁 | 評 |
|---|---|---|
| ✅ 共用 `<ModuleLoading>`/`<Spinner>`/EnhancedTable loading 骨架 | `/finance`、`/tours/[code]`、`/view/[id]`、`/p/tour/[code]`、`/settings/company`、`/library/customers/[id]`、各 ListPageLayout 頁 | ✅ |
| 🔴 自刻 `animate-spin rounded-full border-morandi-gold` div | `/library/archive-management`、`/calendar`（CalendarGrid） | 🔴 非共用 Spinner |
| 🟡 純文字「載入中...」 | `/accounting/opening-balances`、`/accounting/vouchers`（Detail）、`/finance/reports`、`/todos`、`/settings/company`（分公司）、`shared-data/banks/countries/airports`（table 內文字） | 🟡 非 Skeleton |
| 🟡 自刻 Loader2 置中（對客頁） | `pay/*`、`setup/[token]`、`public/contract/sign/[code]`、`/login`（兩個彈跳 dot 自刻動畫） | 🟡 對客頁自刻 |

**空狀態 Empty**
| 做法 | 出現在哪些頁 | 評 |
|---|---|---|
| ✅ EnhancedTable 內建 emptyState / emptyMessage | `/orders`、`/tours`、`/library/customers`、`/library/suppliers`、`/marketing/website`、`/workspaces` | ✅ |
| 🟡 自刻 `<div>`/`<Card>` + icon + 文字 | `/library/archive-management`、`/library/customers/[id]`（各 tab）、`/library/attractions`、`/tours/[code]`（收款/請款）、`/accounting/*`、`/visas`（純文字 div + 未定義 token `morandi-gray-500`） | 🟡 無統一 EmptyState 組件 |
| 🔴 行動版 placeholder（`.app-placeholder` / inline style 各異） | `/app/orders`、`/app/calendar`（用 class）、`/app/settings`（全 inline style #666，連 class 都沒用） | 🔴 行動版內部都不一致 |

→ **建議統一**：抽一個共用 `<EmptyState>`（icon+標題+說明+選用 action）取代各頁自刻 div/Card 空狀態；載入一律走 `<Spinner>`/`<ModuleLoading>`，清掉 `/library/archive-management`、`/calendar` 的自刻 `animate-spin`。`/visas` 引用不存在的 `morandi-gray-500` 等數字階 token（silent 失效）要優先修。

---

## 結語：4 類最關鍵不統一（各一句）

- **表格**：`shared-data` 四頁（banks/countries/airports/insurance-grades）全手刻 `<table>`、三套表頭背景（`bg-muted/50`/`/30`/`morandi-container/30`）+ 三種行高 + banks↔countries 複製貼上 — 最該收編進 `EnhancedTable`。
- **卡片**：`/workspaces/[id]` 整頁靠 `eslint-disable` 壓制硬編碼 `rounded-[24px]` + `shadow-[rgba(...)]` 漸層卡（6 個 _components 檔散落）— 此頁最大技術債、唯 AiHealthTab 走 token 可當修正範本。
- **頁籤**：路由級 ContentPageLayout tabs 與內容級 shadcn Tabs 兩套 SSOT 清楚，但 `settings/company`/`、/ai` 設定 dialog 仍手刻 button tab，且 `/tours/[code]` 留著 dead-ish `_TourTabs`。
- **分頁**：`/visas` 與 `shared-data` 四頁全量 render 無分頁（airports 6000+ 筆），違反「列表分頁固定 15 筆」效能紅線；`/finance` 用自刻分頁列且套主 CTA 樣式 — 應統一回 EnhancedTable `serverPagination`。


---

# UI 元素 × 出處彙整：對話框 / 狀態標籤 / 空狀態載入回饋

> 來源：`workspace/健檢/ui-inventory/*.md`（91 頁逐頁盤點）+ `rg` 回查 `src/app` / `src/components` 補。
> 彙整日期：2026-05-26。負責元素：🪟 對話框 Dialog / 🏷️ 狀態標籤 Badge / 🔔 空狀態·載入·回饋。
> 評級：✅ 標準（走共用組件 + 語意 token）｜🟡 半對齊（殼對齊、局部手刻或美術色）｜🔴 異常（手刻 modal / Tailwind 預設色 / 美術色當語意色 / 原生彈窗 / 未定義 token）。

---

## 🪟 對話框 Dialog / Drawer / Popover

共用 SSOT：`src/components/dialog/form-dialog.tsx`（`FormDialog`，內含 level + 統一 header/footer + loading 防連點）、`src/components/shared/EntityFormDialog.tsx`、底層 `src/components/ui/dialog.tsx`（`DialogContent` 必設 `level={1|2|3}`）、確認框走 `src/lib/ui/alert-dialog.tsx`（`confirm()` / `alert()` / `prompt()`）+ `src/components/dialog/confirm-dialog.tsx`（`ConfirmDialog` / `useConfirmDialog`）。

### A. 共用 FormDialog / EntityFormDialog（設 level，最佳實踐）
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `FormDialog`（內建 footer + loading） | 統一標題/副標/Save·X footer | /accounting/accounts、/accounting/checks、/accounting/vouchers（新增傳票）、/library/attractions、/library/suppliers、/hr/roles、/visas、/tours/[code]（新增支出 level=2）、/finance/settings（銀行/類別）、/workspaces/[id]（Billing 新增付款）等 12+ 處 | ✅ |
| `EntityFormDialog`（內建 isSubmitting） | 同上、實體 CRUD 用 | /channels（新增頻道 level=1）、/channels/[id]（發送公告 level=1）、/finance/settings（收/付款方式）、/workspaces（編輯租戶） | ✅ |

### B. 🟡 共用 Dialog 殼 + 自刻 footer（殼對齊、footer 手刻語意色）
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 裸 `<Dialog>`+`DialogContent level={n}` + 自刻 footer | level 有設、footer 自己排按鈕 | /workspaces（新增租戶 level=1、soft-gold×2 無主次）、/accounting/accounts（編輯科目 customFooter 含 Trash2）、/accounting/vouchers（傳票明細 level=1 純檢視）、/orders（新增訂單 level=1）、/todos（新增任務 level=1）、/tours（建團 TourFormShell level=1）、/dashboard（小工具設定 level=1） | 🟡 |
| `ManagedDialog`（showFooter=false 全自刻 footer） | footer 全 soft-gold、無主次區分 | /library/customers（CustomerAddDialog、CustomerDialog）、/library/customers/[id]（編輯顧客） | 🟡 footer 自刻 |
| FormDialog 但用 `maxWidth` 未明設 level | 不確定 level 是否被 maxWidth 取代 | /bot/[lineUserId]（綁定客戶）、/visas（新增申辦、FormDialog 預設 level） | 🟡 待確認 level 機制 |

### C. 🔴 裸 Dialog 無 level（違反「Dialog 必設 level」紅線）
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Dialog>`+`<DialogContent>` 完全沒 level prop | 儲存鈕硬刻金底 | /workspaces/[id]（LLM Token 4-step wizard、API 整合設定 — 兩個都無 level） | 🔴 缺 level |
| 裸 Dialog 充當 wizard、未明設 level | DialogFooter outline+default | /hr/bonus-settlement（結算 wizard）、/hr/salary-settlement（新增結算 wizard） | 🔴 裸 Dialog 非 FormDialog、未明 level |
| 裸 Dialog level + footer 按鈕手刻語意色 | footer 收/付款語意色手寫 | /finance/payments（AddReceiptDialog 95vw×90vh）、/finance/requests（AddRequestDialog）、/pay/[token]（填寫付款資訊 level=1、footer 自刻） | 🔴 footer 手刻 |

### D. 🔴 完全手刻 modal / portal overlay（不走 Dialog 組件、不設 level）
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `createPortal` + `fixed inset-0 bg-black/xx` 自刻面板 | `bg-white` 硬寫底色、無統一 footer | /ai（RetrospectiveModal 對話復盤、SpeedCardEditor 速記卡編輯 — 見 `src/app/(main)/ai/_components/AiConversationsTab.tsx`） | 🔴 手刻 modal |
| 自刻 `<div>` overlay `background:rgba(0,0,0,.55)` + 自刻 btnStyle | AI 行程助理面板 `#FDFAF6` | /tours/[code]/display-editor（AiAssistDialog — `_components/AiAssistDialog.tsx`、`EditorToolbar.tsx`） | 🔴 不走 Dialog、不設 level |
| 手刻 lightbox / 側欄 portal（合理例外） | 圖片燈箱 / BusinessPanel 側欄 | /ai（ImageLightbox `bg-black/85`、BusinessPanel） | 🟡 合理（燈箱/側欄非表單對話框） |

### E. 🔴 原生 window.confirm / alert（非統一確認框）
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 瀏覽器原生 `window.confirm()` | 系統灰彈窗、跳出感 | /ai（速記卡刪除 / 復盤刪除）、/workspaces/[id]（AiSettings handleRemoveLlm 移除 LLM） | 🔴 應走 `@/lib/ui/alert-dialog` 的 `confirm()` |

### ✅ 已正確走共用確認框 `@/lib/ui/alert-dialog`（對照組、不需改）
/accounting/accounts、/accounting/checks、/accounting/period-closing、/accounting/vouchers、/dashboard、/library/archive-management、/library/suppliers、/library/customers、/finance/treasury/disbursement、/hr/roles、/hr/salary-settlement/[id]、/settings/company、/orders、/tours、/calendar 等；`ConfirmDialog`+`useConfirmDialog` 用於 /hr、/todos。

### 其他散落
| 做法 | 出現在哪些頁 | 評 |
|---|---|---|
| inline 展開區塊（非 dialog）取代彈窗 | /login（忘記密碼 inline）、/settings/company（分公司新增/編輯 inline）、/marketing/website（編輯走路由跳轉） | 🟡 設計選擇 |
| /app（行動版）登出無確認框、直接執行 | /app/more（登出無 confirm、無 disabled 防連點） | 🔴 |

→ **建議統一**：
1. 一律 `FormDialog` / `EntityFormDialog` + 明設 `level={1|2|3}`；footer 不自刻、用內建 submit/cancel。
2. 確認框一律 `@/lib/ui/alert-dialog` 的 `confirm()`，**移除所有 `window.confirm`**（/ai、/workspaces/[id]）。
3. 手刻 portal modal（/ai 復盤·速記卡、display-editor AI 助理）改包 `DialogContent level`。

---

## 🏷️ 狀態標籤 Badge / Status / Tag / Chip

共用 SSOT：`src/components/ui/status-badge.tsx`（`StatusBadge`，tone API 或 type+status API，內部查 `src/lib/design/status-tone-map.ts`）+ table cell `src/components/table-cells/status-cells.tsx`（`StatusCell`）。**全站根病根**：`StatusBadge` 的 `success` tone 內部寫 `bg-morandi-green/15 text-morandi-green`、`danger` tone 寫 `bg-morandi-red/15 text-morandi-red`（美術色，非 `status-success`/`status-danger` 語意 token）—— 連最標準的共用組件都從美術色軌出發。

### A. ✅ 走共用 StatusBadge / StatusCell（最佳實踐，但繼承上述根病根）
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<StatusBadge type="..." status>` （type+status API） | soft pill、查 status-tone-map | /finance/requests（payment_request）、/finance/treasury/disbursement、/tours（tour）、/tours/[code]（receipt / payment_request） | ✅（組件層仍 morandi-green/red） |
| `<StatusCell type="...">` table cell | badge | /finance/payments（receipt）、/finance/reports（DisbursementTab/IncomeTab payment） | ✅ |
| `<StatusBadge tone label>`（legacy tone API） | soft pill | /hr（員工狀態）、/library/attractions（Dialog 已驗證 tone=success） | ✅ |

### B. 🟡 共用組件但用 shadcn `<Badge variant>`（同概念兩套並存）
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Badge variant=secondary/default/outline/destructive>` | variant 機制，無語意 token | /accounting/accounts（科目類型、系統科目）、/accounting/checks（票據狀態 statusConfig.color 帶但未套用）、/accounting/reports/trial-balance、/hr/roles（N 個分頁）、/shared-data/insurance-grades（唯讀徽章） | 🟡 |
| 同頁列表用 StatusBadge、Detail 用 Badge variant | 同概念兩套寫法 | /accounting/vouchers（列表 StatusBadge+tone、Detail Badge+variant） | 🔴 不統一 |

### C. 🔴 各頁手刻 className map（每頁自己一套狀態色）
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `<Badge>` + 自帶 className map（HR 三結算頁、各自手刻） | cancelled 用 `bg-red-100 text-red-700`（Tailwind 預設）、settled/submitted 用 morandi-green、pending/draft 用 morandi-muted | /hr/bonus-settlement/[tourId]、/hr/salary-settlement、/hr/salary-settlement/[id] | 🔴 三頁各手刻、混 Tailwind 預設色 + 美術色 |
| 本檔內自定義 `StatusBadge`（非共用組件）+ `STATUS_COLOR` map | `text-morandi-income`/`text-morandi-gold`/`text-morandi-red`/`text-morandi-secondary` | /library/customers/[id]（訂單/交易/帳單狀態） | 🔴 同名不同物 + 美術色 |
| 自刻 `getStatusTone` map（不走 status-tone-map.ts SSOT） | 提案=pending / 進行中=success / 待結案=warning | /tours/[code]（總覽團狀態） | 🟡 自刻 tone map |

### D. 🔴 Tailwind 預設色當狀態色（嚴重違規 UI 紅線）
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| `OrderStatusBadge` → 整套 Tailwind 預設色 | pending_review `bg-amber-100`、hk `bg-blue-100`、kk `bg-green-100`、hl `bg-orange-100`、lk `bg-teal-100` | /orders（`_components/OrderStatusBadge.tsx`、`simple-order-table.tsx`） | 🔴🔴 整套 Tailwind 預設色 |
| TodoCard `PRIORITY_COLORS` / `COLUMN_COLORS` map | 5緊急 `bg-red-500`、4高 `orange-500`、3中 `amber-500`、低 `slate-400/300`；期限 `text-red-600`/`amber-600`/`orange-500` | /todos（優先級標籤、期限色、新增任務 dot） | 🔴🔴 Tailwind 預設色 + slate（連 morandi 都不是） |
| Tailwind 預設綠/amber 當啟用·待生效·已繳 | `text-green-700`、`border-amber-200 bg-amber-50`、overdue `bg-red-100 text-red-700`、驗證框 `bg-green-50`/`bg-red-50` | /workspaces/[id]（AiSettings 啟用中、data sources 待 RAG、Addons API 啟用中、Billing overdue、LlmTokenDialog 驗證結果/完成勾） | 🔴 多處 Tailwind 預設色 |
| bot 暫停標 `text-orange-500`、復盤 pending `bg-orange-50 text-orange-700` | inline Tailwind orange | /ai（bot 暫停、復盤狀態 pending） | 🔴 |
| 未讀紅點 class `bg-status-danger-bg0`（疑拼錯失效 class） | `-bg0` 不存在、實際無底色 | /ai（未讀數紅點、3 處重複） | 🔴 失效 class |
| 行動版未讀點用藍 `--app-accent` #3B82F6 | 桌面規範未讀走 status-danger 紅 | /app/dashboard（通知未讀紅點） | 🔴 |

### E. 🔴 自刻 span/div + 美術色 morandi-green/red 當語意色（最大宗）
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 收入/盈虧/已付/啟用 用 `morandi-green`，支出/拒絕/停用/不平衡 用 `morandi-red` | 美術色當「成功/危險」語意 | /accounting/opening-balances（平衡）、/accounting/period-closing（已結轉/淨利損）、/accounting/vouchers（平衡）、/finance（收支圖示）、/finance/reports（OverviewTab 收支、TourPnlTab 盈虧）、/pay/[token]（已付清/收據 confirmed·rejected）、/p/[tour]/[code]（N天N夜膠囊、業務員引導）、/public/contract/sign（已簽署）、/workspaces（停用）、/workspaces/[id]（Overview 啟用）、/library/customers（詳情驗證徽章）、/library/attractions（啟用 `bg-morandi-green/80`、分類 `morandi-blue`） | 🔴 美術色當語意色（應 status-success/danger） |

### F. 🔴 未定義 token / hardcode hex（渲染極可能失效）
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| 用不存在的數字階 token `morandi-gray/blue/purple/green-100/red-100` | tokens.css 只有 morandi-green/red/gold 無數字階 → 多半無底色 | /visas（列表狀態欄、自刻 span）、/library/customers/[id]（部分） | 🔴🔴 失效 token |
| SaveIndicator hardcode hex | 綠 `#A8D5A2` / 黃 `#E8C57A` / 紅 `#E89A8C` inline style | /tours/[code]/display-editor（儲存狀態指示） | 🔴 hardcode hex |
| emoji ✓ / ⚠️ 當狀態（無 Badge、無 token） | 純文字 emoji | /shared-data/banks（啟用欄 ✓）、/shared-data/countries（啟用欄 ✓）、/library/customers（未驗證 ⚠️） | 🔴 emoji 當狀態 |

### ✅ / 例外（正確走語意 token 或合法品牌色，不需改）
- 走 status token：/no-access（ShieldX `status-danger`）、/pay/[token]（待確認 `status-warning`）、/workspaces/[id]（AiHealthTab `status-*`、IntegrationDialog 必填 `status-danger`）。
- morandi-gold 品牌標記（非語意狀態）：/channels/[id]（owner Crown）、/channels（section 小標）、/hr（員工編號 pill）、/settings/company（主要 Star）、/workspaces/[id]（使用中方案）。
- **社群品牌色例外（W 5/23 拍板合法）**：/ai（LINE 綠 / FB 藍 / IG 粉 channel badge）。
- 頻道未讀點用金 `bg-morandi-gold`（W 之前拍板）：/channels —— 與 design 紅線「未讀→status-danger」不一致、標**待確認**是否刻意例外。
- 對客提案頁獨立 CIS（copper/棕/luxury hex）：/p/canvas-demo、/p/[tour]/[code]、/p/*-proposal/[code] —— 對客客製、不算違規。

→ **建議統一**：
1. **先治根病根**：改 `src/components/ui/status-badge.tsx` 的 `success`→`status-success`、`danger`→`status-danger`（改一處全站受益）。
2. **D 類最緊急**（Tailwind 預設色）：/orders OrderStatusBadge、/todos 優先級·期限、/workspaces/[id] 多處 —— 全改走 `StatusBadge type=...` + status token。
3. **C 類三頁手刻 map 收斂**：/hr 三結算頁統一走 `StatusBadge`。
4. **E 類**：收入/支出/盈虧的 morandi-green/red 改 `status-success`/`status-danger`。
5. **F 類 bug**：/visas、/ai 未讀點 `-bg0`、SaveIndicator hex —— 修失效 class / 換 token。

---

## 🔔 空狀態 EmptyState / 載入 Loading·Skeleton / 回饋 Toast·確認框

共用 SSOT：Toast 走 `sonner`（`toast.success/error/warning`）+ 文案常數 `COMMON_MESSAGES`；錯誤翻譯 `@/lib/db-error-translate`；載入 `src/components/module-loading.tsx`（`ModuleLoading`）/ `src/components/ui/spinner.tsx`（`Spinner`）/ `src/components/ui/skeleton.tsx`；空狀態 `src/components/ui/empty-state.tsx`（`EmptyState`，**幾乎沒人用**）；列表載入/空狀態走 `ListPageLayout loading` / `EnhancedTable` 內建。

### 回饋 Toast / 錯誤訊息
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| ✅ `sonner` toast（success/error/warning） | 右下浮層 | 全站絕大多數寫入頁：/accounting/*、/ai、/channels、/hr/*、/library/*、/finance/*、/tours/*、/visas、/workspaces/* 等 30+ 處 | ✅ |
| ✅ toast + `COMMON_MESSAGES` 文案常數 | 文案中央化 | /accounting/reports/*（PLEASE_SELECT_DATE / LOAD_FAILED）、/accounting/period-closing | ✅ |
| 🟡 一處硬編字串、一處走 COMMON_MESSAGES（不統一） | 「操作失敗，請稍後再試」硬編 | /accounting/checks | 🟡 |
| 🟡 失敗只進 `logger.error`、無 toast（用戶無感） | 靜默失敗 | /accounting（讀設定缺口）、/accounting/reports/general-ledger（載入失敗）、/todos（拖曳排序失敗） | 🟡 |
| 🔴 自刻錯誤橫幅 + 美術色/Tailwind/硬編紅 | 紅框 | /login（登入錯誤框 morandi-red）、/change-password（morandi-red）、/reset-password（morandi-red）、/app（`.login-error` 硬編 rgba(239,68,68)）、/finance/reports（TourPnlTab `text-red-600` Tailwind）、/hr（資遣試算 `amber-300/50/800` Tailwind）、/shared-data/insurance-grades（`text-orange-600` Tailwind）、/public/contract/sign（morandi-red）、/setup/[token]（morandi-red） | 🔴 顏色軌分岔 |

### 確認框（與「對話框 E 類」對照、此處看回饋面）
| 做法 | 出現在哪些頁 | 評 |
|---|---|---|
| ✅ `confirm()`（`@/lib/ui/alert-dialog`）/ `ConfirmDialog` | 大多數刪除/結轉/兌現操作（見對話框段 ✅ 清單） | ✅ |
| 🔴 原生 `window.confirm` | /ai（速記卡/復盤刪除）、/workspaces/[id]（移除 LLM） | 🔴 |
| 🔴 無確認、無回饋直接執行 | /app/more（登出） | 🔴 |

### 載入 Loading / Skeleton
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| ✅ 共用 `ModuleLoading` | 整頁置中 Loader2 | /finance、/settings/company、/view/[id]、/workspaces/[id]、/p/[tour]/[code]、/p/[tour]/[code]/canvas、/tours/[code]、/tours/[code]/display-editor | ✅ |
| ✅ 共用 `Spinner` | sm/md/lg | /hr（提交）、/library/customers/[id]（size=lg + LoadingBlock）、/tours（手機 size=lg）、/tours/[code]（TabLoading size=lg） | ✅ |
| ✅ `ListPageLayout loading` / `EnhancedTable loading`（列表骨架） | 列表防白閃 | /accounting/accounts、/accounting/checks、/accounting/vouchers、/finance/payments、/finance/requests、/hr/bonus-settlement、/hr/salary-settlement、/library/customers、/library/suppliers、/marketing/website、/orders、/workspaces | ✅ |
| 🟡 純文字「載入中...」（非 Spinner/Skeleton） | 文字 | /accounting/opening-balances、/accounting/vouchers（Detail）、/accounting/reports/*（按鈕「查詢中」）、/bot/[lineUserId]、/settings/company（分公司）、/shared-data/*（colSpan row `t('loading')`）、/todos、/finance/reports | 🟡 文字載入、不統一 |
| 🔴 自刻 `animate-spin` spinner（非共用 Spinner） | 手刻轉圈 | /library/archive-management（`border-b-2 border-morandi-gold`）、/calendar（CalendarGrid `border-morandi-gold`）、/app（`.login-loading` 兩個彈跳 dot @keyframes） | 🔴 自刻動畫 |
| 🟡 對客頁自刻 Loader2 置中（非 ModuleLoading，單頁可接受） | Loader2 | /pay/[token]、/pay/result、/pay/mock/[token]、/setup/[token]、/public/contract/sign | 🟡 |

### 空狀態 EmptyState
| 做法 | 長相 | 出現在哪些頁 | 評 |
|---|---|---|---|
| ✅ 列表組件內建空狀態（`emptyMessage` / EnhancedTable） | 統一 | /library/customers、/library/suppliers、/marketing/website、/orders、/workspaces | ✅ |
| 🔴 行動版自刻 `.app-placeholder` / inline-style（彼此還不一致） | 圖示+h2+p+按鈕 | /app/calendar、/app/orders（用 `.app-placeholder` class）、/app/settings（改 inline style、跟前兩者不一致） | 🔴 自刻、非共用 EmptyState |
| 🟡 自刻 `<div>`/`<Card>` + icon + 文字（散落、未用共用 EmptyState） | 各頁自排 | /ai（Bot icon）、/library/archive-management（Archive icon）、/library/attractions（MapPin）、/library/customers/[id]（找不到顧客 / 各 tab）、/tours/[code]（TrendingUp icon）、/channels（純文字）、/hr/bonus-settlement/[tourId]（Card「找不到團」）、/marketing/website/[code]（ImageOff） | 🟡 自刻空狀態 |
| 🔴 自刻空狀態 + 未定義 token | `text-morandi-gray-500`（不存在） | /visas（列表空狀態） | 🔴 失效 token |

→ **建議統一**：
1. **Toast/錯誤**：錯誤橫幅顏色全部從 morandi-red/Tailwind 收斂到 `status-danger`-bg/text token（/login、/change-password、/reset-password、/app、/finance/reports、/hr、/shared-data/insurance-grades、/setup/[token]、/public/contract/sign）；硬編字串改走 `COMMON_MESSAGES`。
2. **載入**：自刻 `animate-spin`（/library/archive-management、/calendar、/app）改 `<Spinner>`；純文字「載入中…」漸進換 `<Spinner>` 或 Skeleton。
3. **空狀態**：散落自刻收斂到共用 `EmptyState`（目前幾乎無人用）；行動版 `.app-placeholder` vs inline-style 先對齊一套；修 /visas 失效 token。
4. **確認框**：移除 /ai、/workspaces/[id] 的 `window.confirm`；/app/more 登出補確認 + disabled 防連點。

---

## 三類最關鍵不統一（一句話總結）

- **對話框**：共用 `FormDialog`/`EntityFormDialog`（設 level）已是主流，但 /workspaces/[id] 兩個 wizard、/hr 兩個結算 wizard 用「裸 Dialog 無 level」，且 /ai、/tours display-editor 還有 `createPortal` 手刻 modal + /ai、/workspaces/[id] 原生 `window.confirm` —— 該全部收進 `FormDialog + level` 與 `@/lib/ui/alert-dialog`。
- **狀態標籤**（老闆顏色統一重點）：三套並存 ——「✅ 共用 StatusBadge/StatusCell」（但共用組件根病根：success/danger tone 內部用美術色 morandi-green/red）、「🔴 各頁手刻 className map」（/hr 三結算頁、/library/customers/[id]）、「🔴🔴 Tailwind 預設色」（/orders OrderStatusBadge、/todos 優先級、/workspaces/[id] 多處）—— 先改共用組件 success→status-success / danger→status-danger，再清 Tailwind 預設色與手刻 map。
- **空狀態·載入·回饋**：Toast 已高度統一走 sonner，但「錯誤橫幅顏色」全站從 morandi-red / Tailwind red 各走各的（/login、/app、/hr、/finance/reports…），載入有 ModuleLoading/Spinner 共用組件卻仍多處自刻 `animate-spin` 與純文字，且共用 `EmptyState` 幾乎沒人用、空狀態全頁自刻 —— 該把錯誤色收斂到 status-danger、空狀態收斂到 EmptyState。


---

# UI 元素 × 出處彙整：圖示 Icon

> 圖示庫：`lucide-react`（382 檔、無混用其他庫、21 處合理 inline SVG）。全站共 172 個不重複 icon。
> 互動版（可勾選保留哪個）：`icon-選擇器.html`。

## 🎨 圖示 Icon

**A. ✅ 統一的部分**
- 圖示庫：全站只用 `lucide-react`、無混用
- 圖示顏色：走 token（`text-morandi-*` / `text-status-*`）、少量 hardcode
- 線寬 strokeWidth：多走預設、無亂象

**B. 🔴 同一動作用了多種 icon（要統一）**
| 語義動作 | 並存的 icon（用幾檔） | 出現在哪 | 建議統一 |
|---|---|---|---|
| 編輯 | `Edit2`(14) `Pencil`(9) `Edit`(3) `SquarePen`(1) `PenLine`(1) `FileEdit`(1) | 訂單/客戶/HR 操作欄、各 Dialog | → Edit2 |
| 刪除 vs 關閉 | `X`(71) `Trash2`(49) `XCircle`(9) `Ban`(1) `Minus`(2) | 全站 | 刪除→Trash2、關閉→X |
| 打勾/確認/成功 | `Check`(47) `CheckCircle2`(17) `CheckCircle`(5) `CheckSquare`(2) | 全站 | 釐清「勾選框/成功狀態/確認鈕」 |
| 警告/提示 | `AlertCircle`(29) `AlertTriangle`(16) `Info`(8) `HelpCircle`(2) | 全站 | 錯誤→AlertCircle、警示→AlertTriangle |
| 載入 vs 重整 | `Loader2`(61) `RefreshCw`(11) `RotateCcw`(4) `RotateCw`(1) | 全站 | 載入→Loader2、重整→RefreshCw |
| 設定 | `Settings`(5) `Settings2`(1) `Sliders`(1) `Wrench`(1) | 設定頁/工具 | → Settings |
| 展開/收合全部 | `ChevronsUpDown`(2) `ChevronsDownUp`(2) | 表格/樹狀 | 對齊用途 |

**C. 🔴 圖示尺寸三軌並存**
| 寫法 | 範例 | 出現在哪 | 評 |
|---|---|---|---|
| `size={數字}` | size={16}/{14}/{12}/{20} | 全站多數 | 🔴 |
| `size="em"` | size="0.95em"/"0.875em"/"1em" | 操作欄、部分 | 🔴 |
| Tailwind class | `w-4 h-4`/`h-5 w-5`/`h-3 w-3` | 全站多數 | 🔴 |

→ **建議統一**：同一動作收斂到單一 icon（見上表建議）；尺寸寫法全站擇一（建議 `size="0.95em"` 跟字級連動、或統一 `w-4 h-4`）。互動勾選版見 `icon-選擇器.html`。


---

