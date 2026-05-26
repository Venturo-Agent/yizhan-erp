# 員工職能簡化：eligibility 旗標 → capability 驅動（William 2026-05-24 討論）

## William 的點

新增員工時要在職位下勾「可當業務 / 助理 / 團控 / 代墊款人」（eligibility 旗標）。覺得這模式怪、想簡化。
直覺：可以寫入訂單的人 = 業務；沒寫入訂單 capability = 不算業務。旅行社「團/訂單/業務」界線本來就模糊、不該硬框。

## 現況（查證）

- `hr/_components/EmployeeForm/BasicInfoSection.tsx`：eligibility 勾選「可被指派為 業務/助理/團控/代墊款人」、新員工按職務預設帶入、可手動取消。
- `hr/roles/page.tsx:43`：isEligibility tabs 不是 workspace feature、獨立管理。
- orders 有 `sales_id`（業務）/ `assistant_id`（助理）= 指派欄位。
- → 現在有「**兩層**」：capability（能做什麼）+ eligibility 旗標（可被指派為哪個角色）。

## 主 Claude 建議：合併成一層（capability 驅動）

**對、簡化合理、而且正中架構哲學**（紅線 #0：能力定義一切、不要角色名單）。eligibility 旗標是疊在 capability 上的多餘第二層。

新模型：

1. **拿掉 eligibility 旗標**。
2. **指派池 = 有對應 capability 的人**：
   - 業務/助理 下拉 = 有 `orders.write`（訂單寫入）capability 的員工
   - 團控 下拉 = 有 `tours.write`/`tours.manage` capability 的員工
   - 代墊款人 = 有對應財務 capability 的員工
3. **業務 vs 助理 = 每張訂單的「指派」**（這單誰主誰副、填 sales_id/assistant_id），不是員工身上的固定標籤。

## 取捨（誠實）

- 下拉會列出「所有有能力的人」（連老闆也在）→ 你不指派就好。比維護 eligibility 旗標簡單、可接受。
- 反面：若想「某人能寫訂單但不該被列為可指派業務」（譬如老闆）→ 失去這個細分。但這細分的成本（多一層設定 + 困惑）通常 > 效益。
- 解了「團/訂單/業務界線不清」：capability 彈性 —— 小社一人全能=哪都能指派；大社分工=capability 拆。

## 🔑 統一心智模型（William 2026-05-24 追問「開團 vs 團控 重複了」後釐清）

問題根源：系統把**三件不同層的事**混在一起，所以才覺得重複：

| 層                                   | 是什麼                            | 例子                                                     |
| ------------------------------------ | --------------------------------- | -------------------------------------------------------- |
| **能力 Capability**                  | 「我能做這個動作嗎」              | `orders.write`（能開訂單）、`tours.write`（能開團/編團） |
| **指派 Assignment**                  | 「這一筆是誰負責」                | 這張訂單的業務=A、助理=B；這個團的團控=C                 |
| ~~角色類型 Role-type / Eligibility~~ | ~~「他是不是業務/團控」固定標籤~~ | **← 應該砍掉、它就是混淆來源**                           |

**「我可以寫入開團」vs「我可以當團控」為什麼覺得重複：**
因為「團控」現在被當成一個 eligibility 旗標 / 類型、跟「能開團」(tours.write capability) 撞在同一層。
**釐清後其實不重複、是兩層：**

- **開團 = 動作** → `tours.write` capability（誰能建立/編輯團）
- **團控 = 指派** → 這個團指派誰來操作（從「有 tours.write 的人」裡挑、填在團上）

→ 同一個 capability、不同層。一個是「能不能建」、一個是「這團誰顧」。砍掉中間那層「團控類型旗標」，重複就消失。

**全面套用：** 業務/助理/團控/代墊款人 全部不是「員工身上的類型」、而是「每筆記錄上的指派」、指派池 = 有對應 capability 的人。員工身上只有 capability。

**好處：** 徹底解決「業務也能開團 → 重複」—— 那只是「這人同時有 orders.write + tours.write」、能被指派到訂單角色也能被指派到團角色、毫無衝突、毫無重複。小社一人全 capability、大社拆開。

## 關鍵岔路：「開團」與「團控」要不要拆成不同能力？（William 2026-05-24 追問）

澄清：「能新增旅遊團」(capability) ≠「團控」(assignment)。能開團只是「有資格被指派為團控」、不是「就是團控」。團控是每個團上指派的人。同一人可開 A 團卻把 A 團團控指派給別人。

但有一個要 William 拍板的設計選擇：

- **A（簡單）**：一個能力「能新增/編輯團」(tours.write) + 每團指派團控。業務跟團控對「團」能做的事**一樣**、差別只在「誰被指派顧這團」。
- **B（細分）**：拆兩個能力 ——「開團」(建立團殼) vs「團控操作」(改行程/供應商/運作)。業務只能開團殼、團控能改運作。

判準：你公司「業務 vs 團控 對團能做的事」一樣（→A）還是團控能做的更多（→B）？
**待 William 回答 A / B** → 決定 capability 顆粒度。

## 「誰可以當團控」的結論（William 2026-05-24 追問大小公司差異）

問題：團控選填、但誰可以被指派為團控？開團的通常不是團控（小公司業務開團、大公司團控自己開）。

**結論：團控候選池 = 有「團寫入(tours.write)」capability 的人。而「哪些角色有這能力」由公司配置 —— 這個配置就是大小公司差異的開關：**

- 小公司：給「業務」角色 tours.write → 業務能開團 + 在團控候選。業務開完可把團控指派給專門顧團的人（那人也有 tours.write）。
- 大公司：只給「團控」角色 tours.write、業務不給 → 業務開不了團、也不在團控候選；團控自己開自己顧。

→ 同一模型涵蓋大小公司、差別只在「給哪個角色」。

✏️ **更新（William 2026-05-24 追加 case）：要拆兩個能力。** William 指出關鍵 case：小公司業務為了快、可以自己開團、但**不該出現在團控候選**。一個能力做不到（有 tours.write 就會進團控池）。所以拆：

- **「開團」能力** = 建立/編輯團來賣（小公司業務給這個 → 能開團）
- **「團控」能力** = 操作團（行程運作/供應商/顧團）→ **團控候選池 = 有這個的人**
- 業務有「開團」沒「團控」→ 能開團、但不出現在團控指派下拉。✅ 正是要的。
- 不算回到旗標：「團控」是真權限（能不能做顧團操作）、同時守住那些動作、不是純標籤。

✏️ **最終定案（William 2026-05-24「能進團員名單分房分車 = 團控」洞察）：團控綁現成能力、零新增！**

William 解法：團控 = 「能進團員名單做分房/分車的人」。查證：這能力**已存在** = `tours.members.write`（團員名單寫入）。所以團控候選直接用它、不用新建。

**全部落在現成 capability（零新增）：**
| 角色（候選池）| 對應現成 capability |
|---|---|
| 業務 / 助理 | `orders.write`（訂單寫入）|
| 開團（能建團）| 團的寫入能力（tours 建/編、scoping 時確認確切 code）|
| **團控** | **`tours.members.write`**（團員名單 / 分房分車）|

關鍵 case 解法（小公司業務）：有「開團」+「訂單寫入」、但**沒** `tours.members.write` → 能開團接單、但不在團控候選（不能分房分車）。✅

→ **大方向定案：**

- 業務/助理 池 = `orders.write`；團控 池 = `tours.members.write`；開團 = tours 寫入能力
- 業務/助理/團控 全靠「每筆記錄指派 + capability 候選池」、**砍掉所有 eligibility/角色類型旗標**
- 各公司按規模自配角色能力、系統不框死職能、零新增 capability

## 🔍 重大發現（2026-05-24 追「移除訂單助理」時挖到）

William 要移除訂單「助理」、追蹤發現助理欄跟「團控」糾纏：

- **系統裡沒有任何真正的「團控」指派欄位。** 旅遊團列表的「團控」欄（`tours/_constants.ts col_assistant:'團控'`）**純粹讀訂單的 `assistant`（助理）欄**（`ordersByTourId.assistant`）。
- `tours` 表有 `leader`（Json）—— 但那是**領隊/導遊**、不是團控。
- 開團時內嵌訂單表單 `hideAssistant` 把助理藏起來 → 現在「團控」欄半殘、只有事後單獨編訂單塞助理才有值。
- **結論：團控從沒被當真的角色存過、一直借住「助理」欄。這就是助理/團控混淆的根。**

→ 所以不能直接刪助理（會連帶弄壞團控顯示）。William 拍板順序（msg 402）：**先把團控改成來自「團員名單寫入(tours.members.write)」能力、解除對 order.assistant 的依賴、助理才能安全刪。**

### 給 William 選的 A/B（msg 403、待回）

- **A（推薦）**：在團上加真正的「團控」指派欄（controller_id）、開團/編團從 members.write 池選、列表顯示這人 → 助理整個刪、團控變真角色。成本：1 DB 欄 + 團表單 1 下拉 + migration。
- **B（最省）**：列表「團控」欄先拿掉、助理立刻刪、之後再補團控指派。成本最小、但團控暫不顯示。

## 助理移除清單（已盤、待團控解依賴後執行）

- `add-order-form.tsx` / `order-edit-dialog.tsx`：拿掉助理下拉 + state + OrderFormData 欄位
- `orders/page.tsx` handleAddOrder + `useTourCreateOperation.ts` + `ToursPage.tsx`：payload 不再寫 assistant
- `tour-form/TourOrderSection.tsx`（hideAssistant 內嵌）+ ConvertToTourDialog hideAssistant prop
- 保留：DB `orders.assistant`/`assistant_id` 欄位（非破壞）、orders entity select
- `eligibilities.ts TOURS_AS_ASSISTANT` + HR 勾選：屬更大的 eligibility 拆除、後續

## 🔍🔍 更大發現（2026-05-24 追 406 問題時挖到）：團控有「三套並存」機制

深查發現「指派誰控這團」的系統**早就存在、還很完整**、而且同一概念有三套並存（混亂根源）：

### 三套並存（同一個「團控」）

1. **舊 eligibility 旗標**（`eligibilities.ts`）：`tours.as_sales`/`tours.as_assistant`/`tours.as_controller`/`finance.advance_payment`。HR 員工頁 `BasicInfoSection.tsx` 勾選「可被指派為 X」。**訂單表單的業務/助理下拉用這個**（`useEligibleEmployees`）。← William 要砍的。
2. **新「選人欄位」配置系統**（`workspace_selector_fields` 表 + `/api/job-roles/selector-fields`）：管理者自訂指派欄位（name / level:tour|order / is_required / 對應職務 roles）。`TourSettings.tsx` 開團時依 level='tour' 動態顯示、依**職務(role_id)** 過濾可選員工、存進 `tour_role_assignments` 表。← **這就是選項 A 的現成骨架。**
3. **旅遊團列表「團控」欄**：偷讀訂單 `order.assistant`（最舊最假、跟前兩套都不通）。

→ **三套不互通 = 混亂的根。** 收斂方向：砍(1)、統一用(2)、修(3) 讓列表讀 `tour_role_assignments`、然後助理可安全退場。

### 注意：選人欄位(2) 目前依「職務」過濾、William 模型要「能力」過濾

- (2) 候選池 = 員工 role_id ∈ 欄位對應 roles（職務導向）
- William 模型 = 團控池 = 有 `tours.members.write` 能力的人（能力導向）
- 收斂時要決定：選人欄位的過濾改吃 capability、還是維持職務對應。

### 旅遊團「新增/提案/模板」權限現況

- 正式團 / 提案 / 模板 **共用同一個開團流程**（`useTourCreateOperation`、靠 status 區分）、**同一個權限、沒分**。
- William 要「模板獨立成權限」→ 需新增 capability（如 `tours.template.write`）、現在沒有。

### HR 職務設定旅遊團現有選項（回答 William #3）

- A. /hr/roles 權限分頁：旅遊團 8 個（總覽/訂單/團員/行程/展示行程/報價/合約/結案）× 看+改
- B. 員工可指派身分勾選：業務/助理/團控/代墊款人（舊旗標、要砍）

## 📌 順帶完成（2026-05-24、與本討論無關）

- workspaces 加 `industry`/`sub_industry` 欄位 + 9 租戶分類（OpenCloud 規劃、William 指示、Claude MCP apply）。migration 檔：`supabase/migrations/20260524031500_add_workspace_industry_classification.sql`、已 apply production、**待 commit**。多產業 SaaS 脈絡未知、待 William 補。

## ✅✅ 最終定案（William msg 409/410、2026-05-24）：選單直接看能力、零旗標

William：「旗標真的很不 OK」。鎖定模型：

- 有「寫入訂單(orders.write)」能力 → 進「業務」選單
- 有「寫入團員(tours.members.write)」能力 → 進「團控」選單
- 兩個都有 → 兩邊都出現（小公司全能業務自然涵蓋、零衝突）
- 「助理」整個從系統消失

**關鍵發現**：`workspace_selector_fields` DB **一筆都沒有**（9 workspace 全空）→ 選人欄位系統是 dead code、不用遷移/不用救。直接走「選單看能力」最簡單。

✏️✏️ **重大更正（msg 411/412、2026-05-24）：我前面對「團控」的判斷錯了。**

查 `useEligibleEmployees` 全部呼叫點發現：**4 個旗標全部都有真的選單在消費**：
| 旗標 | 真正消費的選單 |
|---|---|
| `tours.as_sales`（業務）| 訂單表單業務選單（add-order-form / order-edit-dialog）|
| `tours.as_assistant`（助理）| 訂單表單助理選單 |
| `tours.as_controller`（團控）| **旅遊團表單團控選單**（TourBasicInfo:199、必填、存 `tours.controller_id`）|
| `finance.advance_payment`（代墊款人）| 財務請款表單（useRequestForm）|

**前面 🔍/🔍🔍 兩段「沒有真正團控、只借住 order.assistant」是錯的：**

- `tours.controller_id` **早就是真實、必填欄位**（NewTourData.controller_id、tours entity select 有、TourBasicInfo 必填選單）。註解：「團控控整團、必填。權限系統依此判斷誰能看到全團團員/訂單」→ controller_id 是 load-bearing（驅動 visibility）。
- 真正壞的只有：旅遊團**列表**的「團控」欄（col_assistant）顯示 order.assistant、不是 controller_id → 純顯示 bug。
- 「選人欄位 / workspace_selector_fields」是更邊緣的**廢棄品**（DB 全空、無人消費）—— 真正在用的是 controller_id + 旗標、不是它。前面把它捧成「選項 A 骨架」也偏了。

### ✅ 修正後的收斂計劃（不用動 DB、controller_id 早有）

1. 做「誰有 X 能力」查詢 hook（員工 → role → role_capabilities）
2. 4 個選單候選來源：旗標 → 能力
   - 業務 ← `orders.write`；團控 ← `tours.members.write`；代墊款人 ← `finance.advance_payment.write`
3. 助理整組移除（訂單下拉 + OrderFormData + 寫入 payload）
4. 旅遊團列表「團控」欄修成讀 `tours.controller_id`（不再讀 order.assistant）
5. 砍人資員工頁旗標勾選 + eligibilities.ts + useEligibleEmployees

### 待 William 拍（msg 412/414）

- [~] **Q1 代墊人（msg 413→415→417 來回收斂中）**：
  - msg 413 想放財務設定 → msg 415 覺得對小公司多餘 → msg 416 我提「列全員不篩」→ **msg 417 William：不行、要篩、不然很亂、問是不是只能保留旗標**。
  - 查證：`finance.advance_payment.write` 能力**存在**（capabilities.ts:199）但**不在 module-tabs**（HR 角色設定還不能勾）；目前實際篩用的是 eligibility 旗標。
  - msg 418 我提「用能力篩到職位」→ **msg 419 William 反問：小主管怎麼辦？又回到老問題。**
  - 🔑 **查出根本原因**：系統「**能力只能給角色、不能給個人**」（`employees.role_id` 單一角色 + `role_capabilities` role 層級、**無 employee_capabilities / 個人 override 表**）。→ 只要有「某個人是例外」、角色層級就接不住 → **這正是旗標存在的原因：旗標 = 給個人開的後門。**
  - 真正的 fork（個人例外住哪）：
    - **🅐 正規解**：加「個人能力 override」（職位之外單獨加能力給某人）→ 代墊 + 未來所有個人例外同一套解、永遠零旗標。**但動資安層**（has_capability RLS 要連個人能力算）、是大工、應獨立規劃。
    - **🅑 務實解**：承認代墊 = 給個人的信任指派（W msg 413 自己講過）、**保留唯一一個旗標**。業務/團控走能力、助理刪。
  - 我建議（msg 420）：先 🅑、🅐 當下一個獨立題目。
  - **✅ William 拍 🅐（msg 421）：「就寫好吧」** —— 做正規的個人能力 override。整套一個原則、徹底零旗標。
  - 附加要求：① 公司沒開此功能 → 請款單代墊人欄**隱藏**；② 代墊人選取 UX 要修（見下）。

## ✅ 最終拍板（msg 421）：做 🅐 個人能力 override + 分階段實作

### 分階段計劃（msg 423）

- **階段0**：代墊 UX 小修（安全暖身）
- **階段1**：個人能力 override 地基 ⚠️**資安雷區**
  - DB：新 `employee_capabilities`（employee_id, capability, workspace_id, granted_by）
  - 推導：get-layout-context / validate-login / useMyCapabilities 合併 role_caps + 個人 caps
  - **RLS：`has_capability_for_workspace()` 要連個人能力一起算 ← 動完必測登入（4/20）**
  - HR UI：員工表單「額外能力」區（取代 eligibility 勾選）
  - **階段1 詳細計劃要先給 William 過目、再動資安段**
- **階段2**：業務/團控/代墊 下拉改吃能力（需 `useEmployeesWithCapability` hook）+ 砍 eligibilities.ts/useEligibleEmployees/HR 勾選；代墊加 feature gating（沒開就隱藏）
- **階段3**：助理刪除（order form 下拉 + OrderFormData + payloads）+ 列表團控欄改讀 controller_id
- **階段4**：模板獨立權限（待 Q2）
- 全程 branch、不 push（[[feedback-destructive-changes-use-staging-branch]]）

### 代墊 UX 問題（msg 421 要研究、已找到）

- `RequestItemList.tsx:271-314`：點代墊圖示 → `onUpdate({advanced_by:'_pending'})` 塞佔位切換出欄位 → 再點下拉才選人。**兩步多餘。**
- 修法：點圖示 → 下拉直接開好、一步選人。
- 候選來源不統一：RequestItemList 用 `suppliers(type=employee)`、useRequestForm 用 `useEligibleEmployees(FINANCE_ADVANCE_PAYMENT)` → 一起理。

### 待 William（msg 423）

- [x] Q2 → **全開工（msg 424）**、模板放階段4。branch `feat/role-capability-redesign` 已建。

## ✅✅ 執行完成（branch feat/role-capability-redesign、未 push、全程 type-check + 守門綠）

- **階段0** 代墊 UX 一步到位（combobox defaultOpen）— commit 8066613
- **migration 清理** 移除 OpenCloud 不完整的 industry backfill — 7d11a06
- **地基** useRoleCapabilities + useEmployeesWithCapability(hide-if-none) — f5c0aa7
- **階段2** 4 選單改吃能力（業務←orders.create/edit.write、團控←tours.members.write、代墊←finance.advance_payment.write）+ 助理整組移除 — e22df30
- **階段1** 砍 eligibility 系統（module 定義移除 3 旗標 tab、代墊轉正規能力、codegen 重生、移除 eligibilities.ts/useEligibleEmployees/employee-eligibilities/2 API/HR 資格勾選區）— 07b8ca9
- **階段4** 模板獨立權限 tours.template.write（TourFilters gate）— e5ab582
- **清理** useEmployeeForm 未用 import/變數 — (cleanup commit)
- ⚠️ DB employee_eligibilities 表保留（非破壞、未來可 drop）。**完全沒動 DB 權限函式/RLS**（無 4/20 風險）。

### deploy 前/後注意（William 已知）

- 代墊（🅐 msg 439）：預設關、deploy 後在職務權限把「可代墊款」勾給角色（如會計）、原 9 個代墊人回來
- 模板：同樣預設關、deploy 後勾「可建立模板」給該角色
- 業務/團控：活躍租戶角色已有對應能力、選單照常

### 尚未做

- [ ] 團控列表欄（msg 440 問 William 加/不用）：查證發現原本是 dead code（沒 render）、待 William 決定要不要加真欄位
- [ ] 登入驗證（auth path 未動、風險近零、可選跑 e2e）
- [ ] 品牌 brand 檢查（Task #5、William msg 434、排在最後）

## 執行進度（branch: feat/role-capability-redesign）

### ✅ 階段0 完成（代墊 UX、commit 8066613）

- `combobox.tsx` 加 optional `defaultOpen` prop（掛載即展開+聚焦）
- `RequestItemList.tsx` 代墊欄 `_pending` 時 `defaultOpen` → 點圖示一步出可選清單
- 順帶清理：移除 OpenCloud 冗餘且不完整的 backfill migration（只 UPDATE 無 ADD COLUMN、單獨跑會炸）commit 7d11a06

### ✏️✏️ 方向大改（William msg 428、2026-05-24）：取消個人能力 override、回純角色 SSOT

William 拍板：**不要「個人能力」這層、做一個完整的角色 SSOT 就好**（辛苦一點沒關係、但不要有任何錯誤）。

- 所有能力從「職務權限」(`role_capabilities`) 來、**一個真相來源**
- 業務/團控/代墊/模板 → 都做成職務權限裡的開關、**預設全關**、哪個職務該有就勾
- **🔑 hide-if-none 規則**：整間公司沒有任何人具備某能力 → 該按鈕/欄位消失（William 特別交代「記得要做到」）
- **✅ 完全不動 DB 權限函式**（無 4/20 風險）。代價：粒度=職務層級、小主管要某能力就給對應職務、無個人例外。

→ **下方「階段1 個人能力 override」全部作廢**（employee_capabilities 表 / has_capability 改 / 三處 merge 全取消）。改為下面「階段1（修正版）」。

### 🔑 實作關鍵發現：capabilities.ts / module-tabs.ts / eligibilities.ts 都是 codegen 產物

- SOURCE = `src/modules/*.ts`、跑 `npm run codegen:permissions` 生成、**不可手改生成檔**
- 「eligibility 旗標」= module 定義裡標 `isEligibility: true` 的 tab（codegen 路由到 eligibilities.ts、排除在 module-tabs 職務權限外）
- 現有 eligibility tabs：`tours.ts` 的 as_sales/as_assistant/as_controller + `finance.ts` 的 advance_payment

### 砍旗標 = 改 module 定義 + 重跑 codegen

- `tours.ts`：**刪** as_sales / as_assistant / as_controller（業務改用 orders.create.write、團控改用 tours.members.write、助理刪除）
- `finance.ts`：advance_payment **從 isEligibility 改成正規 tab**（→ finance.advance_payment.write 變職務權限開關、正是 msg 428 要的）
- 重跑 codegen → eligibilities.ts 變空 → 移除 useEligibleEmployees / useEmployeeEligibilities / HR 旗標勾選

### 能力對應（最終）

| 指派 | 能力                                            | 狀態                          |
| ---- | ----------------------------------------------- | ----------------------------- |
| 業務 | `orders.create.write`（能新增訂單）             | ⏳ 待 William 確認（msg 430） |
| 團控 | `tours.members.write`（寫團員）                 | ✅ 已是職務權限開關           |
| 代墊 | `finance.advance_payment.write`（轉成正規開關） | ✅                            |
| 助理 | — 刪除                                          | ✅                            |

### ✅ 已建地基（commit 待做）

- `src/data/entities/role-capabilities.ts`：useRoleCapabilities（讀 workspace role_capabilities、RLS 可讀）
- `src/lib/permissions/useEmployeesWithCapability.ts`：依能力過濾員工（取代 useEligibleEmployees、空清單=hide-if-none）
- `employees.ts` slim select 補 role_id

### 階段1（修正版）：能力開關進職務權限 + 選單看能力 + 砍旗標

- 確認/補齊能力在 module-tabs（職務權限可勾）：業務=orders.write、團控=tours.members.write（已有）、代墊=finance.advance_payment.write（**要補進 module-tabs**）、模板（階段4 新增）
- 預設全關（不自動 seed；現有租戶 grant 策略待定：漫途的角色補上以免斷、新租戶 default off）
- `useEmployeesWithCapability(cap)` hook（純角色查詢：employees JOIN roles JOIN role_capabilities）
- 選單（業務/團控/代墊）改吃能力
- **hide-if-none gating**：workspace 無人有該能力 → 隱藏對應按鈕/欄位
- 砍 eligibilities.ts / useEligibleEmployees / HR 旗標勾選

### ~~階段1 調查（個人 override 版、已作廢、保留 audit trail）~~

**現況：能力只從角色來、4 個推導/檢查點全純角色：**

1. DB `has_capability_for_workspace(_ws, _code)` = `employees JOIN role_capabilities ON role_id`（21 條 RLS policy 共用）
2. `get-layout-context.ts`（app SSOT）：抓 role_id → role_capabilities → capabilities Set
3. `validate-login/route.ts`：登入時獨立抓 role_capabilities 給 client
4. `check-capability.ts`（API 守門 require-capability 用）：獨立查 employees + role_capabilities
   （`useMyCapabilities` 從 useLayoutContext 拿、不需獨立改）

**階段1 實作（只「多給」不「拿走」、低炸登入風險）：**

- 新表 `employee_capabilities`(id, employee_id FK→employees, capability_code, workspace_id FK, enabled, granted_by FK→employees, created_at; UNIQUE(employee_id, capability_code)) + workspace-scoped RLS
- `has_capability_for_workspace` 改：role 能力 `OR` employee_capabilities（additive、無人失去存取）
- 上述 2/3/4 三處 app 推導：role∪個人 合併
- 動完**必測登入**（service_role 模擬視角 + 實際登入）
- HR 授予 UI 放階段2
- [ ] Q2 模板獨立權限這批一起做、還是下一批？（msg 414 待回）
- [x] ~~Q3 加 controller_id 欄位~~ → **取消、欄位早就存在**

### 模型最終樣貌（業務語言）

| 角色   | 怎麼決定誰能被選                                       | 哪裡管                     |
| ------ | ------------------------------------------------------ | -------------------------- |
| 業務   | 有「寫訂單」能力                                       | role 配能力（HR 角色設定） |
| 團控   | 有「寫團員」能力                                       | role 配能力（HR 角色設定） |
| 助理   | **取消、不存在**                                       | —                          |
| 代墊人 | 要篩選（W msg 417）→ 🅐能力(推薦) / 🅑一個個人旗標、待選 | HR 角色設定（🅐）           |

### 執行紀律

- 大改動（動人資 + 表單 + DB）→ **開 branch 做、不直接 push**（[[feedback-destructive-changes-use-staging-branch]]）

## migration 待辦

- [ ] `20260524031500_add_workspace_industry_classification.sql` 已 apply production、待 commit（避免 drift）
