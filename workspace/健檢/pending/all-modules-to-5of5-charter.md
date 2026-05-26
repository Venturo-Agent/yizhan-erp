# 派工書 — 所有 module 推 5/5 升級書 — 2026-05-20

> 派工人：William（透過 Claude Opus 4.7、老闆角色）
> 承辦：OPENCLAW（agent: main、人格 Max）
> 任務性質：**對每個非 5/5 module 寫「升級到 5/5」具體計劃**
> 視野：全 27 modules 都要 5/5、沒滿分等於沒進步

---

## 為什麼

William 拍板：「沒有滿分要怎麼進步、怎麼升級？」
5 維度矩陣現況：

- 5/5：0 module
- 4.5/5：calendar、visas（最接近）
- 4/5：channels、customers、orders、tours、todos、tour*attributes、marketing、hr、ai_hub、addon_data*\*
- 3.5/5：database、documents、esim、office、hr_salary_settlement、platform_integrations、workspaces
- 3/5：settings、shared_data_management
- 2.5/5：accounting、archive-management、finance、hr_bonus_settlement

要從「滿分模式」反推每個 module 缺什麼、列具體升級書。

---

## 任務

對每個非 5/5 module（= 全部 27 個）、產出一份「升級書」（upgrade plan）：

### 每份升級書格式

路徑：`workspace/健檢/pending/upgrades/{module}-to-5of5.md`

內容：

```markdown
# {module} 升級到 5/5 計劃

## 當前分數：X/5（依據：5dim 矩陣）

## 5 維度狀態

- 讀取效能：✅ / ⚠️ / ❌（具體缺什麼）
- 資安：✅ / ⚠️ / ❌
- 架構：✅ / ⚠️ / ❌
- 開發品管：✅ / ⚠️ / ❌（特別講 e2e、lint suppress、type 完整度）
- 清理：✅ / ⚠️ / ❌（unused exports/files、dead code）

## 升 5/5 具體 actions（最簡可行）

1. {action 1} — 影響檔 + 預估工時
2. {action 2} — ...
3. ...

## 總工時

N 小時 / 人天

## 預期難度

低 / 中 / 高 + 風險

## 推薦執行順序

給 William 看的 — 我建議先做哪個 action
```

### 範圍紀律

- 27 個 module 都要做、不准跳
- 每份升級書短而精（200-300 行就夠、不要寫成長篇大論）
- 用業務語言寫 William 看得懂的「為什麼這個 action 重要」
- e2e 建議要具體（譬如「寫 calendar.spec.ts 測『建立行程 → 拖移 → 刪除』」）
- 清理建議要具體（譬如「knip 抓到 X.ts、Y.tsx 沒人 import、可刪」）

---

## 必讀（避免重犯）

1. `workspace/_meta/architecture/2026-05-20-swr-realtime-page-audit-pass2-complaint.md` — shared-data 紅線 G **是 false positive**、不要再列進缺口
2. `workspace/_meta/architecture/2026-05-20-modules-5dim-matrix-complaint.md` — 我複盤抓的問題
3. `workspace/健檢/reports/26-modules-x-5-dimensions-matrix.md` — 矩陣現況
4. Pass 1/2/3 既有判決

---

## 紅線

- ❌ 不准動 src/ / migrations/
- ❌ 不准 push / apply migration
- ❌ 不准把 shared-data 紅線 G 再列進來
- ✅ 完成 commit：`audit(upgrades): 27 module 升 5/5 升級書完成 — 2026-05-20`

---

## 預估時間

2-3 小時（27 個 module × 3-5 分鐘平均）。
完成後 Claude Opus 抽 3-5 個 module spot check、確認真實 + 可行。

---

## 開工指令

第一個 message 看到「**UPGRADES-START**」 = 正式開工。
回我「收到、開始寫 27 份升級書」就行。
