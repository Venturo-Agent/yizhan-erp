# Alex 交班筆記 — 2026-05-27 凌晨

> 上一代 Alex 在 William 打 `/handoff` 時寫、給下一代 Alex。
> 本場身分提醒：雖然 Alex 名義是 AI 工程師、但**這整場做的是「全站 UI 統一」大工程**（接手 ccta-l terminal 那場 William 早上開的 UI 普查 / 操作按鈕統一）。

---

## 上層：3 行總結（80% 場景夠用）

1. **你是誰**：Alex（@VT_ALEX_BOT）、yizhan-erp 4 bot 之一。本場接手了「全站 UI 統一」（非 AI 領域、是 William 早上 ccta-l 那場的延續）。
2. **上一場到哪**：UI 統一 **4 批全做完、type-check 全綠**。批1/2/3 + 確認鈕/landing/漸層**已 commit（5cc98ce + 8b3f78b）+ 合併 main 上線**（Coolify 部署過）。**批4（原生控件 49 個收進 Radix）剛做完、已 push fix 分支、但 main 還沒上線**。
3. **下一個動作**：問 William 批4 要不要合併 main 上線（回「上」就 `git push origin fix/customers-into-database:main`）。上完 = 整套 UI 統一收工。

---

## 中層：當前任務狀態

### ✅ 已完成（4 批 UI 統一）

| 批次     | 內容                                                              | 上線狀態                           |
| -------- | ----------------------------------------------------------------- | ---------------------------------- |
| 確認鈕   | 51 鈕 → 金字外框 morandi-gold + CheckSquare                       | ✅ 已上 main                       |
| 純金實心 | 13 鈕 → 漸層 default                                              | ✅ 已上 main                       |
| 批1      | 散刻色 → token（前幾輪已清大半、本批只 2 處）                     | ✅ 已上 main                       |
| 批2      | 美術色當語意 morandi-green/red → status token（11 處 + 6 測試）   | ✅ 已上 main                       |
| 批3      | 操作欄 11 頁收編 ActionCell（擴充 5 可選能力 + 逃生艙）           | ✅ 已上 main                       |
| 批4      | 原生控件 49 個（select 28 + checkbox 21）→ Radix；4 checkbox 保留 | ⏳ **push 了 fix 分支、main 未上** |

### ❓ 等 William 拍板

- **批4 上線**：回「上」→ `git push origin fix/customers-into-database:main`（fast-forward、觸發 Coolify 部署 erp.venturo.tw）。**注意先確認 fix 分支已含批4 commit**（見下層 git 狀態）。
- **批2 孤兒清理**：`RECEIPT_STATUS_COLORS`（src/types/receipt.types.ts）全站 0 引用、是孤兒、要不要整個刪（獨立清理議題、本場只換了它的 token 沒刪結構）。
- **批1 對客提案頁 CIS**：`src/app/(public)/p/**` 的 proposal 頁有 `#c9aa7c`（= morandi-gold 同值）等 hex、本場按「獨立 CIS」保留沒統一。William 說過「除品牌色基本沒例外」、但這些是各自客製提案設計、待確認要不要也收 token。

### ⚠️ 卡點 / 風險

- **換主題驗收沒做**：批2 改完在預設莫蘭迪主題下「看不出變化」（同色）、要換 Airtable/Iron/cream 主題看收款單/薪資/行事曆/看板的狀態色才驗證得到。建議 William 換主題實機看。
- **工作區是 4 session 共用**：混著別人的活（LINE handler、權限 api/roles+capabilities+user.types、orders hooks 重構含刪檔、finance settings、date-input）。William 5/27 凌晨拍板「全部人一起打包」、所以本場 commit 是 `git add -A` 全量（他明確覆寫了「不 git add .」紀律）。
- **批3 兩處合理保留**（William 已默許）：`simple-order-table`（它本身就是 ActionCell 黃金標準來源、反向收編沒意義）、`MemberSurchargeCell`（是表單控制項非操作欄）。

---

## 下層：詳細（想深挖再讀）

### git 狀態（關鍵）

- 當前分支 `fix/customers-into-database`（4 bot 共用工作分支）。
- 已 push 的 commit：`5cc98ce`（打包全工作區 217 檔）+ `8b3f78b`（修 badge.test 遺留測試債）。這兩個**已上 main**（5/27 凌晨 `git push origin fix:main` fast-forward）。
- **批4 改動**：交班這次用 `git add -A` 一起 commit（含批4 + 本筆記 + 工作區其他）、push 了 **fix 分支**。**main 還停在 8b3f78b、批4 沒上 main**。
- 上 main 方式：`git push origin fix/customers-into-database:main`（fast-forward、不切本地分支、避免影響別 session）。

### 守門機制（commit/push 會擋、別 --no-verify）

- pre-commit：type-check + ERP standards 11 項 + Prettier（staged）。撞格式跑 `npx prettier --write <檔>` 修、別跳過。
- pre-push：全測試（~1054）+ 3 個 SSOT 檔同步。本場撞過 badge.test 遺留斷言（組件早改 status-danger 測試沒跟上）、修了。

### 關鍵技術決策（William 拍板）

- 確認/儲存/套用鈕 = `variant="morandi-gold"`（金字外框）+ `<CheckSquare>`；取消等次要鈕維持 soft-gold 不動。
- 「建立/新增/匯入/綁定」這類 dialog 主送出鈕也算「確認類」、一起統一。
- 漸層實心 default（淡金漸層）William 認可、**保留**；他只嫌「純色平塗金實心」（bg-morandi-gold text-white）→ 已改漸層 default。
- Radix `SelectItem` 不允許 `value=""` → 用模組級哨兵常數（`__none__` 等）、onValueChange 換回 ''/null。
- `global-error.tsx` 拿不到主題 CSS 變數 → 漸層色 inline 寫死（不跟主題、是 root error boundary 本質限制）。
- 付款頁 `PayFormDialog` 驗證過：付款值是 React state、提交 preventDefault 不走 FormData、換 Radix 安全、永豐刷卡+匯款兩路沒壞。

### ActionCell 擴充了什麼（批3 基礎、後人要動操作欄會用到）

`src/components/table-cells/action-cells.tsx` 加了 optional：`icon?`（改可選）、`className?`、`hidden?`、`customColor?`、variant 加 `'custom'`、ActionCellProps 加 `renderCustomButton?`（逃生艙）。全向前兼容、新建 `tests/components/table-cells/action-cells.test.tsx`（15 case）。

### UI 普查產出（本場 + ccta-l 早上的）

`workspace/健檢/ui-inventory/`：91 路由逐頁 .md + UI-大全/視覺總覽/視覺對比/icon-選擇器 HTML + 套用確認鈕對比.png + 全站換皮預覽.png。下次要繼續 UI 工作先看這裡。

### 沒做的 / 未來

- 換主題實機驗收（最該做）。
- RECEIPT_STATUS_COLORS 孤兒刪除。
- proposal 頁 CIS 是否收 token。
- 批4 上 main。

---

## 重要紅線（別違反）

- ❌ 不在 transcript 印 token / API key 真值。
- ❌ 寫 memory 前必先列關鍵字給 William 補（本場全程沒寫 memory、走 task list + 本筆記）。
- ❌ commit/push 不 `--no-verify`、不跳守門。
- ❌ 動既有 UI 前先派探查兵 / 走 fix-safe（本場每批都先探查再動、維持住）。
- ✅ commit 共用工作區：預設只 add 自己的檔；**但 William 本場明確拍「全部打包」、才用 git add -A**（這是例外授權、不是常態）。

---

— 上一代 Alex、2026-05-27 凌晨（接手 ccta-l UI 統一、4 批做完、批4 待上 main）
