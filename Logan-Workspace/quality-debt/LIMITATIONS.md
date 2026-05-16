---
title: QDF Limitations — 框架侷限與盲點
created: 2026-05-16
status: active
owner: Logan
note: Logan self-review、誠實列出 framework 弱點、避免讓 W 誤以為「audit 全綠 = 沒問題」
---

# QDF Limitations

> 59 round 累積後的誠實檢視。
> 列「QDF 不抓什麼」「audit 全綠也可能有的問題」「需要其他維度補的」。

## L1：Audit 全綠 ≠ 用戶滿意

8 個 metric 全綠是 **技術衛生** 指標、不是 **業務成果** 指標。
真正品質指標應該是：
- bug 數 / 用戶反饋 / 廠商試用回饋
- 業務流程順暢度
- 新 feature 從規劃到 ship 平均時間

**這些都不在 QDF 範圍**。

⚠ 風險：reward hacking — 為了 audit 綠而綠、業務沒實質改善。

## L2：規則的權威來源是 Logan、不是業務

QDF blueprint 內的 R1-R5 規則（譬如「取消左、主操作右」「spec 必須 10 段」）是 **Logan 自己寫的常識** 或 best practice、**不是 W 業務拍板**。

⚠ 風險：規則錯了、audit 越嚴格越錯。
⚠ 建議：每條規則該有「業務理由」back-reference、不是純美學。

## L3：規則衝突（譬如 CORNER_WORKSPACE_ID）

鐵律 #9「沒有特權 / 沒有 admin bypass」vs 業務現實「漫途自己是平台管理員」**根本衝突**。

我做的「env 化」只是把 hardcode 從 code 搬到 env、**本質沒解決**：平台主 workspace 永遠是 hack。

這類「規則寫得太理想、業務無法達標」的 finding、audit 永遠抓到、永遠修不完。

⚠ 建議：之後 review 鐵律、區分「絕對紅線」vs「理想目標」、後者不該 enforce 進 audit。

## L4：Grep-based audit 的本質限制

QDF 13 個 audit 工具大半用 regex grep（譬如 audit:naming / audit:button-order）：
- **False positive 多**：譬如 audit:naming 抓「請款 / 付款」共現、多數是合理使用
- **False negative 多**：grep 抓不到「同樣概念不同變體」

要真正精準需 AST 分析（複雜度大幅升、維護成本爆）。

⚠ 風險：audit「假精準」誤導——W 看到全綠、誤以為沒問題、實際漏掉真風險。

## L5：過度文檔化的反作用

28 module spec + 4 blueprint + 5 policy doc + 5 fix-log + 12 個額外 docs ≈ **50 個 markdown**。

未來 module 改了 spec 沒同步 → spec 變 **lying source of truth**。
維護成本累積、之後 audit:spec 100% 變成「假成就」。

⚠ 建議：spec 應「逼近 code 真相」、不是離 code 越遠的越多越好。

## L6：缺「品質債產生速率」反向指標

QDF 純看「當下多少 finding」、看不到：
- 每週新 code 產生多少新 finding（速率）
- 修補平均時間（人 / Claude 共同）
- 新 feature 平均產出多少 finding

⚠ 建議：之後加 audit:debt-velocity（看 git log diff 與 audit diff 的關係）。

## L7：沒 UI / integration / E2E test

69 unit tests **全是純函式 service**（leave-severance / fee-distribution / type-guards）。

沒覆蓋的層：
- React component test（Dialog 行為 / form 驗證）
- API integration test（endpoint full flow）
- E2E（Playwright 已有 setup、但沒跑覆蓋）

⚠ 風險：UI 改動沒 test 保護、回歸不易察覺。
譬如本次 RefundReceiptDialog / BindCustomerDialog 遷 FormDialog、沒 test 確認沒回歸。

## L8：CronCreate 是 session-only「假自動化」

Round 41 設的 cron 是 session-only（Claude session 死就消失）。

真自動化要 **OS cron + systemd timer**（已寫 nightly-audit.sh、但 W 還沒設 OS cron）。

⚠ 風險：W 以為「半夜 audit 自動跑」、實際斷掉沒人知道。

## L9：PR Checklist 對人類 reviewer 無用

QDF CHECKLIST.md / CI-Integration 設計給「有開發者 review PR」場景。
但 William / Carson **都不看 code**、實際 reviewer 是 Claude 自己。

self-check 容易過頭、缺第三方驗證。

⚠ 建議：之後加「跨 Claude session review」流程（譬如 cctl 寫的 PR、cctk 來 review）。

## L10：ROI 不對稱

59 round 累積大量 **technical hygiene**（formatter SSOT / audit 工具 / spec 範本）、
但真正影響業務的是：
- 廠商試用回饋
- bug 報告 / 用戶卡點
- 業務流程順暢度

**這次 loop 可能跟業務真正卡的點沒對齊**。
ROI 高的事不一定是 audit 抓的事。

⚠ 建議：下次 loop 前先問業務 — 「上週用戶最常抱怨什麼」、再決定 audit 哪個維度。

## 結論：QDF 是好開始、但不是品質的全部

QDF 解決「technical hygiene」這個維度、但不該誤以為它是品質全貌。

**該補的維度**（未來 framework 升級）：
1. 業務 KPI 維度：bug 數 / 用戶反饋 / 流程時間
2. 用戶體驗維度：A/B 測試 / 用戶調研 / NPS
3. 性能維度：實際 production metric（不是 audit grep）
4. 安全維度：定期 pen test、不只 audit static analysis

**短期建議調整**：
- 不繼續衝 audit 數量、轉向 E2E 測試補 critical flow
- 加 QDF-Limitations.md（本檔）讓 W / 未來 reviewer 知道盲點
- 每條 blueprint rule 附「業務理由」

## 不在這次 review 內

- QDF 跟 CI / GitHub Actions 整合的細節
- 跨 Claude session（cctl / cctk）的 review 流程設計
- 業務 KPI 整合 audit 的具體實作
