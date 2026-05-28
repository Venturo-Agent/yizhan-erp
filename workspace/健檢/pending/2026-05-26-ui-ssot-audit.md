# UI SSOT 5 維度 audit — 2026-05-26

> William 觀察觸發：「UI 層 SSOT 都還沒做好」（個人設定 vs 公司設定看起來很不同；input 邊框顏色不一；font size 散落）。
> 跟「[讀取層不是真 SSOT](2026-05-26-讀取快取同步-全盤盤點.md)」同類型問題：**SSOT 存在但沒人守規矩 + ESLint 沒擋**。
>
> 此 doc 純清單、不動 code。William 拍板優先級後分批清。

---

## 整體結論

5 維度全部有違規、嚴重度由高到低：

| 維度 | 違規檔案數 | 嚴重度 | 立即可動 |
|---|---|---|---|
| D1 Input | 30+ | 🔴 高 | 可 |
| D2 Button | 30+ | 🟡 中 | 可 |
| D3 Border 色 | 24+ | 🔴 高 | 可（換 token）|
| D4 Card | 15+ | 🟢 低 | 可 |
| D5 Typography | 240 個檔案散用 | 🔴 高 | 要先訂規範 |

**根因**：所有維度的 SSOT 都已存在（`<Input>`, `<Button>`, `<Card>`, `border-input`, design tokens）但**沒有 ESLint rule 擋 raw 用法**。新進工程師 / AI agent 看到「能 work 就好」、繼續散刻。

---

## D1 散刻 raw `<input>` 違規（30+ 檔案）

**SSOT**：`src/components/ui/input.tsx` 的 `<Input>`

**規範**：所有 text/email/password/number/date 欄位走 `<Input>` 或 `<DatePicker>`，不准 raw `<input>`。

**違規 TOP 10**（檔案 + raw input 數）：

| 數量 | 檔案 |
|---|---|
| 11 | `tours/_components/itinerary-editor/TimelineEditor.tsx` |
| 9 | `orders/_components/member-edit/MemberInfoForm.tsx` |
| 8 | `orders/_components/MemberRow.tsx` |
| 7 | `finance/payments/_components/PaymentItemRow.tsx` |
| 5 | `settings/company/_components/ImageUploadField.tsx`（部分是 type="file"、合理）|
| 4 | `tours/_components/itinerary-editor/DailyScheduleEditor.tsx` |
| 4 | `settings/personal/page.tsx`（修改密碼 dialog）|
| 4 | `orders/_components/member-row/MemberBasicInfo.tsx` |
| 4 | `login/page.tsx` |
| 4 | `editor/tour-form/sections/features/FeatureItem.tsx` |

**已知例外（不改）**：
- `src/components/ui/date-input.tsx` / `simple-date-input.tsx`：SSOT 自己的實作
- `src/components/ui/image-uploader/index.tsx`：file upload、SSOT 無對應
- `type="file"` / `type="checkbox"` / `type="radio"`：暫無 SSOT 對應

---

## D1b 散刻 raw `<select>` 違規（13 檔案）

**SSOT**：`src/components/ui/select.tsx` 的 `Select / SelectTrigger / SelectContent / SelectItem`

| 數量 | 檔案 |
|---|---|
| 5 | `finance/settings/_components/MethodDialog.tsx` |
| 3 | `orders/_components/PnrMatchDialog.table.tsx` |
| 3 | `visas/page.tsx` |
| 2 | `settings/company/_components/CompanyInfoCard.tsx` |
| 2 | `workspaces/[id]/_components/overview-tab.tsx` |
| 2 | `hr/_components/SeveranceCalculatorDialog.tsx` |
| 2 | `hr/_components/EmployeeForm/BasicInfoSection.tsx` |
| 2 | `finance/settings/_components/CategoriesSection.tsx` |
| 1 | `finance/payments/_components/PaymentItemRow.tsx` |
| 1 | 其他 5 個檔案各 1-2 個 |

剛剛已修：`orders/_contracts/OrderContractDialog.tsx`（簽約團員下拉）。

---

## D1c 散刻 native `<input type="date">`（3 檔案）

**SSOT**：`<DatePicker>` (src/components/ui/date-picker.tsx)

| 數量 | 檔案 |
|---|---|
| 3 | `workspaces/[id]/_components/billing-tab.tsx` |
| 2 | `hr/_components/SeveranceCalculatorDialog.tsx` |
| 1 | `orders/_components/MemberRow.tsx` |

native date input 在不同瀏覽器長相不一、又跟 SSOT 樣式差很多、優先清。

---

## D2 散刻 raw `<button>` 違規（30+ 檔案）

**SSOT**：`src/components/ui/button.tsx` 的 `<Button>`（variant: default / outline / ghost / header-outline / morandi-gold / soft-gold / morandi-destructive 等）

**違規 TOP 10**：

| 數量 | 檔案 | 有 import SSOT |
|---|---|---|
| 21 | `ai/_components/AiConversationsTab.tsx` | ✓ |
| 12 | `editor/tour-form/sections/daily-itinerary/SortableActivityItem.tsx` | ✗ |
| 11 | `ui/rich-text-input.tsx` | ✗（SSOT 內部、可能合理）|
| 9 | `tours/_components/itinerary/MealCell.tsx` | ✗ |
| 7 | `tours/_components/itinerary-editor/FlightSection.tsx` | ✓ |
| 7 | `ui/calendar.tsx` | ✗（SSOT 內部）|
| 7 | `channels/_components/ChannelsSidebar.tsx` | ✗ |
| 6 | `todos/_components/todo-expanded-view/TodoSidebar.tsx` | ✓ |
| 6 | `tour-display/sections/TourHotelsSectionLuxury.tsx` | ✗ |
| 6 | `editor/tour-form/sections/daily-itinerary/DayTitleSection.tsx` | ✗ |

「有 import SSOT 但還散刻 button」= 工程師懶得多用一次、最容易補。

**已知例外**：
- `ui/calendar.tsx` / `ui/rich-text-input.tsx`：SSOT 自己內部用、合理
- 純圖示按鈕（譬如 X 關閉 / 三點選單）有些用 raw button 更輕量

---

## D3 Border 顏色散刻（24 檔案散用 `morandi-container/X`）

**Token 現況**：

| Token | 用途 | 檔案數 |
|---|---|---|
| `border-input` | input / select / date / textarea 標準色（#b8a385）| **15** |
| `border-border` | 一般容器、卡片、分隔線 | **186** |
| `border-morandi-gold` | 強調 / focus / hover | 123 |
| `border-morandi-container` | morandi 容器色（多個 alpha 變體 /20 /30 /50 散用）| **48** |
| `border-status-*` | 狀態色（success/danger/warning）| 29 |
| `border-2` | 加粗 border（特殊強調）| 44 |

**問題**：
- `border-input` 才 15 個檔案、但 raw `<input>` 出現在 30+ 檔案 → input 邊框色根本沒走 token
- 24 個檔案散用 `border-morandi-container/30` `/50` `/40`（譬如 `settings/personal/page.tsx` 的修改密碼 dialog）— 沒有規範什麼時候用哪個 alpha
- `border-border` 跟 `border-morandi-gold` 大量混用、誰用誰沒約定

**建議**：規範哪個 token 用在哪個語意：
- form input → `border-input`
- card / 容器 → `border-border`
- focus / hover → `border-morandi-gold/30` 或 `border-morandi-gold/50`
- 禁用 `border-morandi-container/X`（含糊不清、改 `border-border`）

---

## D4 Card 散刻（15+ 檔案）

**SSOT**：`src/components/ui/card.tsx` 的 `<Card>` `<CardHeader>` `<CardContent>` `<CardFooter>`

**現況**：39 檔案 import 了 Card、15 檔案散刻 `rounded-xl + border + shadow` 自做卡片：

| 數量 | 檔案 |
|---|---|
| 7 | `dashboard/_components/calculator-widget.tsx` |
| 3 | `ai/_components/AiConversationsTab.tsx` |
| 2 | `orders/_quotes/_components/QuickQuoteDetail.tsx` |
| 2 | `finance/treasury/_disbursement/_components/GroupedDisbursementItemsTable.tsx` |
| 2 | `dashboard/_components/amadeus-totp-widget.tsx` |
| 1 | 9 個檔案各 1 個 |

**個人設定 vs 公司設定的根本差異**：
- 個人設定：`<EmployeeForm>` 包成**單張大 Character Card**（`bg-card rounded-xl border border-border shadow-sm`）+ 內部分區
- 公司設定：`<CompanyInfoCard>` + `<Card>` × 4 **多張小 Card 堆疊**
- 兩種架構都用 SSOT `<Card>`、但**設計策略不同**、不是 SSOT 違規問題

要視覺一致需要先拍板：「設定頁該長什麼樣 — 單 Card 包山包海 vs 多 Card 分群？」

---

## D5 Typography 散落（最嚴重）

| Size | 檔案數 | 出現次數 |
|---|---|---|
| `text-xs` (12px) | 189 | 892 |
| `text-sm` (14px) | 240 | **921** |
| `text-base` (16px) | 21 | 35 |
| `text-lg` (18px) | 36 | 51 |
| `text-xl` (20px) | 16 | 26 |

| Weight | 出現次數 |
|---|---|
| `font-normal` | 10 |
| `font-medium` | **555** |
| `font-semibold` | 332 |
| `font-bold` | 76 |

**問題**：
- text-xs 跟 text-sm 出現次數差不多（892 vs 921）— **完全沒共識誰用哪個**
- 同一頁可以看到 cell 用 text-sm 但 header 用 text-xs、或反過來
- font-medium 用 555 次 = 幾乎變成預設值（用 `font-medium` 跟不用沒差）

**已確認的具體不一致**（之前討論過）：
- 列表 cell：orders/tours/suppliers 用 `text-sm`、customers/salary-settlement 用 `text-xs`
- TableHeader 永遠 `text-xs`（已在 SSOT 內定義）但 cell content 各自為政

**建議規範**（要先拍板才能批量清）：
- 列表 cell：`text-sm` 統一
- 表頭：`text-xs` 統一（已是現況）
- Card title：`text-base font-semibold`
- Card subtitle / 輔助說明：`text-sm text-morandi-secondary`
- 按鈕：跟 Button variant 走、不另寫

---

## 建議清理順序

依「擋未來新違規」優先：

1. **加 ESLint custom rule**（一次性、最高 ROI）
   - 禁止 `<input>` `<select>` `<textarea>` raw 用法（強制 import SSOT）
   - 禁止 `border-morandi-container/[0-9]+` 散用
   - 警告 `text-xs` / `text-sm` 沒包在規範路徑

2. **D1c native date** 3 檔案 → DatePicker（最快、影響使用者體驗）

3. **D1b raw select** 13 檔案 → Select SSOT（中等量、視覺立即見效）

4. **D1 raw input** 30+ 檔案 → Input SSOT（量大、分批做）

5. **D3 border token 規範化** + 大量 search/replace（要先拍板規範）

6. **D5 typography 規範** + 大量 search/replace（要先拍板規範）

7. **D2 raw button** 30+ 檔案（量大、視覺差異不大、放最後）

8. **D4 個人 vs 公司設定 layout 統一**（需要產品決策、不只技術問題）

---

## 防新增違規（不只清舊的）

跟讀取層 SSOT 一樣會「**清完又冒新的**」、必須同步加 enforcement：

- ESLint custom rule 擋 raw `<input>` `<select>` `<textarea>` `<button>`（沒 import SSOT 時 warning / error）
- ESLint rule 擋 `border-morandi-container/[0-9]+`（含糊不清）
- 5 維度 audit script（仿 `npm run audit:rls`）、commit hook 跑、新違規擋 PR
- 加進 CLAUDE.md 紅線（譬如「I. UI 元件必走 SSOT、raw HTML 一律違規」）
