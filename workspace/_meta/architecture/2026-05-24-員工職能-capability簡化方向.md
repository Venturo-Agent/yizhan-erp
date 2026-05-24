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

## 待 William 拍板 + 下一步
- [ ] 確認方向：eligibility 旗標拿掉、指派下拉改吃 capability
- [ ] 我盤：現在哪些下拉/邏輯吃 eligibility 旗標（orders 指派、tours 團控、獎金代墊款）+ DB 欄位
- [ ] 提具體改法（這是真改動、要對齊 5 SSOT + 不破既有指派資料）
