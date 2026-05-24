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

| 層 | 是什麼 | 例子 |
|---|---|---|
| **能力 Capability** | 「我能做這個動作嗎」 | `orders.write`（能開訂單）、`tours.write`（能開團/編團）|
| **指派 Assignment** | 「這一筆是誰負責」 | 這張訂單的業務=A、助理=B；這個團的團控=C |
| ~~角色類型 Role-type / Eligibility~~ | ~~「他是不是業務/團控」固定標籤~~ | **← 應該砍掉、它就是混淆來源** |

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
- [ ] Q2 模板獨立權限放階段4（這次）還是下一批？← 回了就開 branch 從階段0開工
- [ ] Q2 模板獨立權限這批一起做、還是下一批？（msg 414 待回）
- [x] ~~Q3 加 controller_id 欄位~~ → **取消、欄位早就存在**

### 模型最終樣貌（業務語言）
| 角色 | 怎麼決定誰能被選 | 哪裡管 |
|---|---|---|
| 業務 | 有「寫訂單」能力 | role 配能力（HR 角色設定）|
| 團控 | 有「寫團員」能力 | role 配能力（HR 角色設定）|
| 助理 | **取消、不存在** | — |
| 代墊人 | 要篩選（W msg 417）→ 🅐能力(推薦) / 🅑一個個人旗標、待選 | HR 角色設定（🅐）|

### 執行紀律
- 大改動（動人資 + 表單 + DB）→ **開 branch 做、不直接 push**（[[feedback-destructive-changes-use-staging-branch]]）

## migration 待辦
- [ ] `20260524031500_add_workspace_industry_classification.sql` 已 apply production、待 commit（避免 drift）
