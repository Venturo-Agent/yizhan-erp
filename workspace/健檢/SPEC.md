# 健檢 SPEC — VENTURO ERP 全方位架構品質健檢

> 建立日期：2026-05-20
> 觸發背景：William 反映「抽象層蓋好了卻沒人使用、強制力不夠、規範流於形式」，需要從嚴苛角度審視整個架構與規範，制定可執行的品質標準。

---

## Why

VENTURO ERP 的架構複雜度極高，存在多個抽象層（entity hooks、SWR cache、RLS、capabilities 等），但從過往審計發現：

1. **SSOT 散裂**：編號產生、錯誤翻譯、cache 失效各有 2-3 個實作者，不是只有一個
2. **抽象層蓋好但沒人用**：`apiMutate` 存在但採用率低、SWR cache key 散刻
3. **規範缺乏強制力**：紅線有文件但沒有 CI 自動偵測、部分規則只靠人為紀律
4. **新功能漏掉 SSOT**：Channels 5/12 那種「做了 4/5 個 SSOT 漏了 HR UI 勾選」的事故

這次健檢不是為了批評過去的技術決策，而是建立**可自動化驗證、可落地執行**的品質標準，讓未來開發有明確的「對 vs 錯」判斷依據。

---

## What Changes

### 健檢範圍（5 大維度）

| 維度 | 目標 | 現狀缺口 |
|---|---|---|
| **架構遵守度** | 每個功能都過 6 層架構、每個 SSOT 都有對應鉤 | 紅線 B（FK）有 migration 待 apply、CIS 半成品未清理 |
| **資安完整性** | 紅線 A-G 全綠、RLS 100% 覆蓋、 無越權漏洞 | 紅線 B（FK）待 apply、紅線 D（closed period）部分模組缺 guard |
| **效能健康度** | SWR cache 策略一致、列表無過度讀取 | 151 處散刻寫入待 ratchet、ref_* table 無 entity hook |
| **開發品管** | pre-commit 全綠、CI 全量跑、無新犯 | `SUPABASE_DB_URL` secret 未設定、audit:rls 只能 code grep |
| **SSOT 對齊度** | 5 SSOT 全同步、HR UI / capabilities / features / seed / routes 全部對齊 | 3 個已廢 bot module drift 未清理 |

### 2026-05-25 方向更新（午夜計畫 — 整合攻擊式稽核 + stale-read 全觀洞察）

> 今天用「臨時攻擊式查詢 + Supabase 內建顧問」抓到一批**自製 audit:rls 漏掉的真洞**（跨租戶 API、護照桶 public、11 條寬鬆 RLS、198 缺索引）。證明健檢有盲區。新增/強化維度：

| 新增/強化 | 查什麼 | 為什麼（今天的教訓） |
|---|---|---|
| **快取失效覆蓋**（新、最高優先） | 每張表「寫入路徑 ↔ 讀它的 4 種快取」對照、找「寫了沒刷」的 stale-read 缺口 | 「操作完讀到舊資料」是系統性病根、自製 audit 抓不到、**會計模組整片中招(P0-1)** |
| **RLS 強度**（強化、非只覆蓋率） | policy 不准 `true`/`auth.role()` 當隔離、INSERT `WITH CHECK` 必過 workspace | 「牆有立」≠「牆夠厚」、抓到 11 條寬鬆 policy 已修 |
| **API 授權** | 每條 route 不信任 client 傳的 workspace_id、有 capability 檢查 | /api/integrations/usage 跨租戶讀洞 |
| **儲存桶 PII 暴露** | 客戶 PII 桶(護照/證件)不可 public、走 signed URL | passport-images 曾 public、護照可無登入下載 |
| **Supabase advisor 接進常駐健檢**（關鍵手段） | advisor security + performance 接進 nightly/CI、跟自製 audit 並用 | advisor 抓得到 rls_always_true / security_definer / 公開桶 / 缺索引、**自製 audit 全漏** |

→ 「資安完整性」目標升級：「RLS 100% 覆蓋」→「**RLS 強度（無寬鬆 policy）+ 無公開 PII 桶 + API 不信 client**」。
→ 「效能健康度」加子項：「**快取失效覆蓋（全站不准 stale-read）**」+「**外鍵全索引**」。

### 健檢文件產出

1. **健檢總覽**（本文）：5 大維度的評估維度與優先順序
2. **架構層面健檢**：6 層架構 + SSOT 對齊 + 抽象層採用率
3. **資安層面健檢**：紅線遵守清單 + RLS 覆蓋率 + 滲透測試缺口
4. **效能層面健檢**：SWR cache + 列表效能 + 連線策略
5. **開發品管健檢**：測試覆蓋 + CI/CD 健康度 + lint/typecheck 狀態
6. **優先修復清單**：P0-P2 修復計劃與依賴關係

---

## Impact

- **受影響的模組**：全部（跨所有頁面、API route、DB schema）
- **受影響的團隊**：William（拍板）、未來所有開發者
- **產出價值**：
  - 讓新功能上線前有明確的「過關標準」
  - 讓 PR review 有自動化工具輔助、不是全靠人眼
  - 讓「抽象層蓋好但沒人用」的問題有可測量指標

---

## ADDED Requirements

### Requirement: 健檢機制文件化

系統 SHALL 提供一套完整的健檢文檔，描述每個維度的檢查點、預期狀態、以及自動化驗證方式。

#### Scenario: 新功能上線前對照健檢清單
- **WHEN** 開發者完成一個新功能
- **THEN** 能夠對照健檢清單確認所有維度都已通過，不需要猜「這樣可以嗎」

#### Scenario: PR review 有自動化工具輔助
- **WHEN** PR 提交到 main
- **THEN** CI 自動跑健檢維度的檢查、error 等於擋 merge

#### Scenario: 量化技術債
- **WHEN** 討論技術債優先順序
- **THEN** 能引用健檢報告中的數據（151 處散刻、3 個 drift 等）量化影響

---

## MODIFIED Requirements

### Requirement: 現有審計工具整合

現有 audit 工具（`audit:rls`、`audit:writes`、`audit:realtime` 等）SHALL 整合進健檢框架，成為可被自動觸發的檢查點。

**2026-05-25 補強**：自製 audit 證實有盲區（漏掉 rls_policy_always_true / security_definer view / 公開 PII 桶 / 缺索引）。健檢框架 SHALL 額外把 **Supabase 內建 advisor（`get_advisors` security + performance）** 接進 nightly + CI、與自製 audit 並用——advisor 抓得到自製工具漏的、是「RLS 強度 / API 授權 / 桶暴露 / 索引」維度的權威來源。並新增「快取失效覆蓋」檢查（寫入路徑 ↔ 讀取快取對照、抓 stale-read）。

---

## REMOVED Requirements

### Requirement: N/A

本次健檢是文件建立，不涉及既有需求刪除。