# 健檢工作清單 — VENTURO ERP 全方位架構品質健檢

> 目標：建立一套嚴苛、可自動化驗證、可落地執行的品質標準

---

## 任務一：架構層面健檢

- [ ] 1.1 確認 6 層架構（L1-L6）的完整性
  - [ ] L1 Feature Gate：features.ts 同步 modules/
  - [ ] L2 Capability：capabilities.ts 衍生機制正常
  - [ ] L3 Org Scope：三維 scope 散刻檢查（需 CI 有 DB）
  - [ ] L4 狀態守門：closed period / locked status 檢查
  - [ ] L5 RLS：workspaces NO FORCE + 各表 RLS 覆蓋率
  - [ ] L6 SSOT：中央 module（codes.ts / db-error-translate.ts）無散刻

- [ ] 1.2 SSOT 對齊度檢查
  - [ ] 5 個 SSOT（路由 / capabilities / module-tabs / features / seed）全同步
  - [ ] HR UI 能勾到所有該有的 capability
  - [ ] Seed migration 沒有漏建預設 capability

- [ ] 1.3 抽象層採用率審查
  - [ ] entity hook 覆蓋率統計（有多少 table 有對應 hook）
  - [ ] apiMutate 採用率（caller 數量追蹤）
  - [ ] invalidate helper export 完整性

---

## 任務二：資安層面健檢

- [ ] 2.1 紅線遵守清單
  - [ ] 紅線 0：無超級管理員（無 `if (isAdmin)` 繞道）
  - [ ] 紅線 A：workspaces RLS NO FORCE
  - [ ] 紅線 B：所有 created_by FK 指 employees(id)
  - [ ] 紅線 C：admin client per-request、新建非 singleton
  - [ ] 紅線 D：無作弊後門（unlock / reopen / override）
  - [ ] 紅線 E：trigger × API 雙寫檢查（audit:writes）
  - [ ] 紅線 F：apiMutate SSOT（SWR 散刻統計）
  - [ ] 紅線 G：per-user cache key 防污染

- [ ] 2.2 RLS 覆蓋率
  - [ ] 所有業務表有 RLS policy
  - [ ] RLS policy 走 `setup_*_rls` procedure、不散刻
  - [ ] join table 有對應 RLS

- [ ] 2.3 滲透測試缺口
  - [ ] cross-tenant 滲透測試覆蓋率
  - [ ] login-api.spec.ts 能跑過（防 4/20 那種事故）

---

## 任務三：效能層面健檢

- [ ] 3.1 SWR Cache 策略
  - [ ] 散刻 `mutate('字串')` 清單（應為 0）
  - [ ] 頁面 / hook 直接 useSWR 統計（A/B/C 分類）
  - [ ] per-user cache key 防污染驗證

- [ ] 3.2 列表效能
  - [ ] 預設分頁筆數（20 筆、分頁 15 筆）一致性
  - [ ] 無「每頁筆數」選擇器
  - [ ] server-side filter vs client-side filter 使用正確

- [ ] 3.3 連線策略
  - [ ] Layout context SSOT（一次抓所有）
  - [ ] Hydration race 防護（_hasHydrated）
  - [ ] 防連點（所有寫入按鈕 `disabled={loading}`）

---

## 任務四：開發品管健檢

- [ ] 4.1 測試覆蓋
  - [ ] 單元測試覆蓋率（entity hook / service / utility）
  - [ ] E2E 測試覆蓋（login-api / cross-tenant / journey）
  - [ ] 並發測試（編號撞號）

- [ ] 4.2 CI/CD 健康度
  - [ ] `audit:rls` 在 CI 全量跑（需 SUPABASE_DB_URL secret）
  - [ ] `audit:writes` 在 CI 跑
  - [ ] `audit:realtime` 在 CI 跑
  - [ ] pre-commit hook 全綠

- [ ] 4.3 Lint / Typecheck
  - [ ] `npm run type-check` 全綠
  - [ ] `npm run lint` 全綠（無新 console.log）
  - [ ] ESLint rule 防再犯（no-direct-useswr-in-pages / no-direct-supabase-writes）

---

## 任務五：優先修復清單

- [ ] 5.1 P0 立即修復
  - [ ] 紅線 B migration apply（tour_control_forms / image_library / file_system）
  - [ ] CI 設定 SUPABASE_DB_URL secret

- [ ] 5.2 P1 一週內修復
  - [ ] SWR baseline ratchet（151 處）
  - [ ] 已廢 bot module drift 清理（facebook_bot / instagram_bot）
  - [ ] travel_invoice 模組決策（補 page 或從 modules/ 移除）

- [ ] 5.3 P2 兩週內修復
  - [ ] 紅線 D 其他模組 closed period guard（journal_vouchers / receipts / disbursement_orders）
  - [ ] CIS 模組決策（補 schema 或移除前端）
  - [ ] ESLint rule 升 'error'（已有 baseline）

---

## 任務相依關係

```
任務一（架構層面）
  └── 任務二（資安層面）
        └── 任務三（效能層面）
              └── 任務四（開發品管）
                    └── 任務五（優先修復清單）

※ 每個任務完成後更新對應健檢文檔的檢查結果
```

---

## 產出文件清單

1. `SPEC.md` — 健檢總覽（本檔）
2. `架構層面健檢.md` — 6 層架構 + SSOT + 抽象層
3. `資安層面健檢.md` — 紅線遵守 + RLS + 滲透測試
4. `效能層面健檢.md` — SWR + 列表 + 連線
5. `開發品管健檢.md` — 測試 + CI/CD + lint
6. `優先修復清單.md` — P0-P2 計劃與依賴