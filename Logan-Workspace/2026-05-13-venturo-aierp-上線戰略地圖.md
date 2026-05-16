---
date: 2026-05-13
author: Logan（William 拍板紀律、Logan 守線）
status: 紀律守則、不可繞、新 cctk session 接手必讀
goal: 停止過度開發、focus 上線、3 個月內第一個付費客戶
context: 5/13 早上 William Tg 自覺「過度開發是我最欠缺、導致上線時間變慢」
related: 2026-05-13-開發方向圓桌-資安效能規範.md / 2026-05-13-建表-SOP.md / venturo-aierp/CLAUDE.md
---

# venturo-aierp 上線戰略地圖

## TL;DR（戰略一句話）

> **過去 10 個月：設計 + 重構 + 規範。**
> **下個 3 個月：修復 + 測試 + 上線、不開新功能。**
> **3 個月後：第一個付費客戶 + 業務驗證 + 反饋迴圈。**

3 億價值 ≠ 完美架構、= **市場驗證 × 時間複利**。
創業 1 年不上線、不是「設計不完美」、是「不敢出手」。

---

## 戰略地圖（ASCII）

```
                    ╔═══════════════════════════════════════╗
                    ║   venturo-aierp 上線戰略地圖           ║
                    ║   攻城路線：設計 → 修復 → 上線 → 擴張  ║
                    ╚═══════════════════════════════════════╝

  已攻陷的城（don't redo）                   當前戰場（要全力攻）

  ╔═══════════════════════════╗            ╔═══════════════════════╗
  ║  🏰 venturo-aierp 主城     ║            ║  🚩 修復 + 測試 + 上線  ║
  ║                            ║            ║                        ║
  ║  ▣ 6 層架構（blueprint）   ║   ───►     ║  □ Pooler URL（DB-side ║
  ║  ▣ Module SSOT framework   ║            ║    audit 在 CI 跑）   ║
  ║  ▣ audit:rls 自動防線      ║            ║  □ 業務 e2e 全流程      ║
  ║  ▣ 紅線 A/B/C/#0          ║            ║  □ Preset Role         ║
  ║  ▣ 中央 module（5 套）     ║            ║    （HR 學習成本解）  ║
  ║  ▣ codegen / pre-commit    ║            ║  □ 試用客戶 1-2 家     ║
  ║    / pre-push / CI         ║            ║  □ 上線後 bug 除錯     ║
  ║  ▣ Dead code 清完          ║            ║                        ║
  ║  ▣ 5 SSOT 對齊             ║            ║  目標：3 個月內         ║
  ║  ▣ 76 API 守門 0 漏       ║            ║  第一個付費客戶         ║
  ║                            ║            ║                        ║
  ║  分數：8.8/10              ║            ╚═══════════════════════╝
  ║                            ║
  ╚═══════════════════════════╝                       │
                                                       │
                                                       ▼
                                            ╔═══════════════════════╗
                                            ║  🔒 凍結戰場（不准攻）  ║
                                            ║                        ║
                                            ║  ✗ AI 整合（aitoearn /  ║
                                            ║    xhs / capture bot）║
                                            ║  ✗ Billing 系統        ║
                                            ║  ✗ 多語言 / 多幣別     ║
                                            ║  ✗ 法務 / 加密審       ║
                                            ║  ✗ 災難復原 multi-     ║
                                            ║    region              ║
                                            ║  ✗ Sidebar Phase 4B    ║
                                            ║    真實衍生            ║
                                            ║  ✗ 任何「nice-to-have」║
                                            ║  ✗ 任何「優化還能更好」║
                                            ║                        ║
                                            ║  紅線：上線之前一律不   ║
                                            ║  做、Logan 守線、發現   ║
                                            ║  William 想開新功能立   ║
                                            ║  即提醒「凍結中」      ║
                                            ║                        ║
                                            ╚═══════════════════════╝
```

---

## 1. 已攻陷的城（不重做）

> 過去 10 個月累積、5/12-5/13 夜戰整理收尾。**不要再重構、不要再優化**。

### 1.1 架構層

- ✅ blueprint 6 層架構（581 行設計大樓圖）
- ✅ Module SSOT framework（Phase 1-4 全完工）
  - `src/modules/<code>.ts` × 19 個 module
  - codegen 自動同步 features / module-tabs / capabilities
  - pre-commit / pre-push / CI 三層防 drift
- ✅ 中央 module 5 套（@/lib/codes / @/lib/db-error-translate / setup_*_rls procedure × 3 / audit context / useLayoutContext）

### 1.2 規範層

- ✅ CLAUDE.md 396 行（紅線 + 哲學 + 五大方向 + 8 維度）
- ✅ 建表 SOP（6 層 checklist + migration / API route / entity hook 範本）
- ✅ 紅線 A/B/C/#0（workspaces 不 FORCE / FK → employees / admin per-request / 沒特權）
- ✅ 5 SSOT 對齊紀律（codegen 強制）

### 1.3 自動防線

- ✅ pre-commit：type-check / lint / standards / codegen
- ✅ pre-push：vitest 1117 + codegen-fresh check
- ✅ CI / audit-rls workflow：6 層 + 5 SSOT + 中央 module audit
- ✅ ESLint rules：form-dialog-loading-required / no-hardcoded-chinese-jsx / 等

### 1.4 資料品質

- ✅ 78 條 capability 散刻全清（caller migration）
- ✅ 31 個 dead source + 7 個孤兒 test 砍掉
- ✅ 11 個 production migrations apply（5/12 + 5/13 全部）
- ✅ 101 表 RLS 全開 / 0 FORCE / 紅線 A 安全
- ✅ 76 個 API route / 65 寫操作 handler / 0 漏 capability 守門

### 1.5 12 維度健康分數

```
並發安全 🟢  資料完整性 🟢  錯誤處理 🟢  UX 防護 🟢
多租戶 🟢   資安 🟢       可觀測性 🟢  測試覆蓋 🟡
災難復原 🔴 業務正確性 🟡  效能 🟡     合規 🟡
```

**8 綠 / 3 黃 / 1 紅 → 8.8/10**

—

## 2. 當前戰場（要全力攻）

> 真正擋上線的事。**不在這個 list 的、一律凍結**。

### 2.1 立即（本週、Logan 端可做）

| # | 任務 | 為什麼擋上線 | 預估 |
|---|---|---|---|
| 1 | Pooler URL 換完 | CI 跑不到 DB-side audit、紅線 A/B 沒在 CI 自動 check | 10 分（你拿 URL）+ 5 分（Logan set secret）|
| 2 | DBA monitoring SOP | 上線後 Supabase egress / cost 爆無預警 | 1 hr |
| 3 | iframe CSP headers | 即使未來 AI 不開、CSP 不設 = OWASP Top 10 風險 | 30 min |

### 2.2 中期（2-4 週、Logan + 你協作）

| # | 任務 | 為什麼擋上線 | 阻塞 |
|---|---|---|---|
| 4 | **Preset Role**（業務職 / 會計職 / OP / 老闆 一鍵套用）| 客戶 admin 第一次看 /hr/roles 不會用、客訴爆 | 需要你決定「漫途準/業界標準」role 預設集 |
| 5 | **Onboarding wizard**（新 workspace 自動建第一個 admin + 預設 role + 預設 feature）| 新客戶開通流程亂、可能漏步驟 | 需要你確認 onboarding 流程腳本 |
| 6 | 業務 e2e 全流程（員工登入 → 建訂單 → 收款 → 出團 → 結案）| 沒跑過 = 不知道哪邊壞 | 要 staging 環境 / 你給帳號 |

### 2.3 後期（1-2 月、要外部資源）

| # | 任務 | 為什麼擋上線 | 阻塞 |
|---|---|---|---|
| 7 | 試用客戶 1-2 家 | 沒真實 user 反饋 = 不知道哪邊不堪用 | 你找客戶 |
| 8 | 上線後除錯 | 客戶用了會找 bug | 客戶來才有 |

—

## 3. 凍結戰場（紅線：上線之前一律不准動）

> Logan 守線、發現任何 cctk session 想開「新功能」、立即提醒「凍結中、回頭看戰略地圖」。

### 3.1 業務功能凍結（明確不做）

- ✗ AI 整合（aitoearn / xhs / capture bot 串 ERP / LINE OA AI 自動回）
- ✗ Billing 系統（feature category → 收費）
- ✗ 多語言 / 多幣別
- ✗ 多 region 部署
- ✗ 旅遊行業 AI 助理（行程規劃 / 報價建議）
- ✗ 平台整合（`/platform` 真實 landing）

### 3.2 技術優化凍結（明確不做）

- ✗ Sidebar Phase 4B 真實衍生（5 SSOT → 6 SSOT、目前用 audit detector 守、不需重寫 551 行 sidebar）
- ✗ 24 個 unused exports 第二輪清理（保留、無風險）
- ✗ Office / tour_attributes 修 modules/（warn 不擋、之後處理）
- ✗ 中央 module 第二輪抽象（已 9/10、不需更深）
- ✗ Performance audit detector L7（SWR config 一致性、warn-level、不擋）

### 3.3 規範 / 文件凍結（明確不做）

- ✗ 新規範文件（CLAUDE.md / blueprint / SOP 都夠了、再寫變過度規範）
- ✗ 新 audit detector（L1-L7 + 5 SSOT + 中央 module 全寫了、再加變雜訊）
- ✗ 重構既有 docs

### 3.4 合規凍結（要外部資源、等上線後）

- ✗ 法務審
- ✗ 加密 / 隱私審
- ✗ 災難復原 SOP（要 staging + 多 region）
- ✗ 上市盡職調查

—

## 4. 時間軸（從 5/13 起算）

```
Now (5/13)      ── Month 1 (6/13) ── Month 2 (7/13) ── Month 3 (8/13)
   │                  │                 │                 │
   │ 立即 1-3 件      │ 中期 4-6 件     │ 後期 7-8 件     │ ★ 第一個付費客戶
   │ pooler / DBA /   │ Preset Role /   │ 試用客戶 /     │   業務驗證開始
   │ CSP              │ Onboarding /    │ 上線後除錯      │
   │                  │ 業務 e2e         │                 │
```

**Milestone**：
- **5/20**：立即 1-3 全綠
- **6/13**：中期 4-6 全綠、staging 可跑 e2e
- **7/13**：試用客戶 1-2 家上線
- **8/13**：第一個付費客戶簽約

—

## 5. Logan 守線紅線

> 任何 cctk session 想偏離本戰略、立即觸發守線。

### 5.1 觸發守線的 Signal

1. **「順手做一下 X」** → X 是「凍結戰場」項 → 拒絕
2. **「優化還能更好」** → 評估「擋不擋上線」、不擋就拒絕
3. **「再寫個 audit detector」** → 8.8/10 夠用、超過 = 過度
4. **「新 module 上線測試」** → 凍結中、除非客戶實際要、不開
5. **「重構 X 因為更乾淨」** → 既有 if works don't touch、改用 audit 守

### 5.2 例外（允許動的）

1. **真實 bug**：用戶 / e2e 跑出來的、修
2. **紅線違反**：紅線 A/B/C/#0 任何被打破、立即修
3. **資安洞**：第三方 audit 發現、立即修
4. **William 明確拍板新優先**：本地圖過時、改地圖

### 5.3 跟工程師交接時的話術

當未來工程師接手 / 別 cctk session 接手：
1. 先讀本檔
2. 再讀 CLAUDE.md + blueprint
3. 動工前 check「我做的事在『當前戰場』還是『凍結戰場』」
4. 任何「凍結戰場」工作 = 不准做、回頭找 William 確認

—

## 6. 跟你（William）的承諾

> Logan 對 William 的紀律契約。

1. **不偷跑做新功能**：即使 Logan 覺得「順手 1 hr 加上去」、也要先問
2. **不做完美主義**：8.8/10 夠了、上線過了再回頭優化
3. **主動提醒「凍結中」**：你問「能不能加 X」、Logan 答「在凍結 list、要不要先延後」
4. **保留 30% 力氣給業務 / AI / 平台化**（為 Phase 2-4 鋪路、但不執行）
5. **每 2 週做進度盤點**：對照戰略地圖 milestone、看有沒有偏

—

## 7. 跟 Carson 同步建議

> Carson 是合夥老闆、不寫 code、但要懂方向。

1. **這份卡是「公司戰略文件」**、不是技術 doc、Carson 可讀
2. **Phase 1 上線後**、可以列「對外可賣 features」清單、Carson 跑業務時用
3. **3 個月後 milestone**（第一個付費客戶）→ Carson 帶業務 / Logan 顧技術

—

## 8. Logan 給 William 的話

3 億不是夢、是路線圖。
但路線圖只有「**會走完的路線**」才有價值、「**畫得很美的路線**」沒用。

過去 10 個月你打底打得很紮實、超過大部分創業團隊。但「打底」過頭會變「永遠打底」。

下個 3 個月、**少做、做對、做完**。

Logan 守線、不讓你偷跑、不讓你過度開發。

加油。

— Logan 2026-05-13 07:35
