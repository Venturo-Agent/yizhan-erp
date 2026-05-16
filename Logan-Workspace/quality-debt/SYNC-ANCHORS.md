---
title: QDF Sync Anchors — 跨檔同步清單
created: 2026-05-16
status: active
owner: Logan
note: 解決「左邊改 X、右邊忘記改」問題、跨 Claude session 都用
---

# Sync Anchors — 跨檔同步清單

> W 痛點（2026-05-15 23:01）：「左邊改了右邊沒改到、影響正式測試跟開發、階段性理由 Claude 搞不懂」
>
> 本檔列「**動 X 場景 → 必同步改的所有檔**」、每改前先讀這份。
> 對齊新 Mac mini 移轉：清乾淨 Claude session 也能 follow。

## 使用方式

動 code 前 / 寫 spec 前、先 grep 本檔找「我要動什麼場景」對應的同步清單。
完成後跑 `npm run audit:quality`、確認所有對應檔同步、沒漏。

---

## A. DB Schema 改動

### A1：新加 DB 表
動 X：寫 migration `CREATE TABLE`
跟著改：
1. `supabase/migrations/{timestamp}_*.sql` — 主 migration
2. `src/lib/supabase/types.ts` — 跑 `npx supabase gen types typescript`
3. `src/types/*.types.ts` — 對應 interface（如有）
4. `src/data/entities/*.ts` — 新 entity hook（如要 SWR）
5. `src/stores/types/*.ts` — store type（如需要）
6. **必加 Rollback** 註解（migration 結尾）
7. 寫 spec.md（如新 module）
8. 跑 `audit:migration` 確認 Rollback 在
9. 跑 `audit:spec` 確認 module 對應

### A2：DB 表加欄位
動 X：`ALTER TABLE ADD COLUMN`
跟著改：
1. migration 加 Rollback 段
2. `src/lib/supabase/types.ts` regen
3. 所有 `.select(...)` 內列出欄位的地方（**用 audit:rls 內 no_deleted_column_refs 反向 grep**）
4. UI 顯示該欄位的 component
5. form state 加新欄位

### A3：DB 表砍欄位（critical）
動 X：`ALTER TABLE DROP COLUMN`
跟著改：
1. 先進 `_pending_review/`、等 W 拍板（鐵律 #8）
2. 砍前先 grep 所有 caller、列清單
3. 所有 `.select('xxx, ...')` 內含該欄位的地方
4. 所有 type / interface 內該欄位
5. 所有 form / display 處理該欄位
6. unit test 同步

### A4：改 status enum 值
動 X：DB `CHECK (status IN (...))` 改
跟著改：
1. migration 含 CHECK constraint 變動
2. `src/types/*.types.ts` type union（譬如 `'pending' | 'paid'`）
3. `src/lib/design/status-tone-map.ts` STATUS_LABEL_MAP 補 / 移
4. UI badge color
5. spec 不變式同步

---

## B. Module / Capability

### B1：新加 module
動 X：寫 `src/modules/{code}.ts`
跟著改：
1. `src/modules/_registry.ts` 加進 ALL_MODULES
2. 跑 `npm run codegen:permissions` 生 features.ts / capabilities.ts / module-tabs.ts
3. `src/components/layout/sidebar-config.ts` 加 SIDEBAR_META / SIDEBAR_ORDER
4. 寫 `Logan-Workspace/modules/{module}-spec.md`（套 _spec-template.md）
5. seed `workspace_features` 給漫途 / 其他 workspace
6. 跑 `audit:rls` 確認 SSOT drift = 0
7. 跑 `audit:spec` 確認 100%

### B2：改 capability code
動 X：`src/lib/permissions/capabilities.ts` 改 cap 名
跟著改：
1. 所有 `requireCapability(CAPABILITIES.X)` 改 import key
2. 所有 `hasCapabilityByCode('xxx')` 字串改
3. role_capabilities seed migration
4. `src/modules/{module}.ts` 內 sub-cap 定義
5. 跑 codegen:permissions 確認 SSOT 對齊
6. 跑 `audit:capability` 確認全綠

### B3：新加 capability
動 X：`capabilities.ts` 加新 cap
跟著改：
1. 對應 module 內 defineModule 加 cap
2. 跑 codegen
3. 對應 endpoint 加 requireCapability
4. UI 對應 ModuleGuard / 條件式 render
5. seed migration 給 default role
6. 跑 `audit:capability` 確認

---

## C. UI 規範

### C1：改 LABELS 字串
動 X：`constants/labels.ts` 內字串改
跟著改：
1. 文件 / spec 內提到的 UI label 同步
2. E2E test selector 用 text 的 case
3. 跑 `audit:i18n` 確認

### C2：加新 dialog（form 型）
動 X：建 `XxxDialog.tsx`
跟著改：
1. **必用 `FormDialog`**（07-ui R1）
2. footer button 順序：取消左 / 主操作右（R4）
3. 對應 page 內 wire 進 state
4. 跑 `audit:ui` / `audit:button-order` 確認

### C3：加新 page
動 X：建 `src/app/(main)/xxx/page.tsx`
跟著改：
1. **list 走 ListPageLayout、content 走 ContentPageLayout**（07-ui R2）
2. 對應 module sidebar entry
3. capability guard（ModuleGuard）
4. 跑 `audit:ui` 確認 Layout SSOT

### C4：改 dialog footer 按鈕順序
動 X：footer 內 Button 順序
跟著改：
1. 對齊 07-ui R4：取消（左、ghost/outline）/ 主操作（右、soft-gold/實心）
2. 跑 `audit:button-order` 確認 0 finding

---

## D. API / 金流

### D1：加新 mutation endpoint（POST/PUT/PATCH/DELETE）
動 X：建 `src/app/api/xxx/route.ts`
跟著改：
1. **必 requireCapability 或 getApiContext**（R1 安全）
2. **必 recordApiAuditContext**（R2 金流嚴謹、如改金錢 / 狀態）
3. **error 走 dbErrorResponse**（R4）
4. 多 step write 必補償回滾（R3）
5. 跑 `audit:capability` 確認守門
6. 跑 `audit:flow` 確認 audit log

### D2：改 critical status 轉換邏輯
動 X：endpoint 內 update status
跟著改：
1. **SQL-level atomic filter**：`.update(...).eq('status', 'expected')`（R2 樂觀鎖）
2. 不要 application-level `if (row.status !== 'x')`
3. update 失敗回 409
4. spec 不變式同步

### D3：改 fee / 結算演算法
動 X：`src/lib/disbursement/fee-distribution.ts` / `src/lib/hr/leave-severance-calculator.ts`
跟著改：
1. unit test 同步（覆蓋新 branch）
2. spec 不變式段同步
3. 跑 `npx vitest run src/lib`

---

## E. Audit 工具自身

### E1：新加 audit 工具
動 X：寫 `scripts/audit-xxx.ts`
跟著改：
1. `package.json` 加 npm script `audit:xxx`
2. `npm run audit:quality` 串接內加進去
3. `Logan-Workspace/quality-debt/AUDIT-TOOLS-INDEX.md` 加索引
4. `STATUS-DASHBOARD.md` metric 表加
5. 寫 finding 報告（如有 finding）

### E2：升級 audit 工具（減 false positive）
動 X：改 `scripts/audit-xxx.ts` regex / EXCLUDED
跟著改：
1. 跑工具確認 finding 數合理
2. 把改動寫進 fix-log
3. 如改規則 → blueprint 同步

---

## F. Spec / 文檔

### F1：改 service implementation
動 X：`src/lib/xxx/yyy.ts` 邏輯改
跟著改：
1. `Logan-Workspace/modules/yyy-spec.md` 不變式同步
2. unit test 同步覆蓋新邏輯
3. 變更歷史段加新 row（日期 / 變更 / 對應）

### F2：寫新 spec
動 X：建 `Logan-Workspace/modules/xxx-spec.md`
跟著改：
1. 套 `_spec-template.md` 10 段
2. 跑 `audit:spec` 確認被識別（命名 convention：`{module}-spec.md`）
3. README.md / STATUS-DASHBOARD module 列表加

---

## G. Migration / DB

### G1：寫新 migration
動 X：建 `supabase/migrations/{ts}_*.sql`
跟著改：
1. 檔名按時序：`YYYYMMDDHHMMSS_*.sql`
2. 含 `BEGIN; ... COMMIT;` transaction
3. 結尾 `NOTIFY pgrst, 'reload schema';`
4. **critical 操作必加 Rollback 註解**
5. 不可逆操作放 `_pending_review/`（鐵律 #8）
6. apply 後跑 `audit:migration`

---

## H. 鐵律 / 全局規範

### H1：發現 hardcoded workspace ID
動 X：grep 到 hardcoded UUID
跟著改：
1. 走 env：`process.env.PLATFORM_WORKSPACE_ID || fallback`
2. ~/.config/venturo/secrets.env 加 export
3. ~/.claude/INFRASTRUCTURE.md 加 var 索引
4. 跑 `audit:hardcoded-id` + `audit:env` 確認

### H2：發現 hardcoded API key
動 X：audit:secret 抓到
跟著改：
1. 立刻移到 ~/.config/venturo/secrets.env
2. code 改 `process.env.X`
3. revoke 舊 key（如已 leak）
4. 跑 `audit:secret` 確認 0

---

## 跨 Claude session 用法

新 session（譬如轉新 Mac mini、cctk / cctl / 男僕 session）：

1. 進門 SOP 先讀：
   - ~/.claude/CLAUDE.md（鐵律）
   - ~/.claude/INFRASTRUCTURE.md（API / cwd / secrets 索引）
   - **本檔 SYNC-ANCHORS.md**（跨檔同步）
   - quality-debt/CHECKLIST.md（PR 前必檢）
   - quality-debt/LIMITATIONS.md（QDF 盲點）

2. 動任何 code / migration / spec 前、grep 本檔對應場景

3. 完成後跑 `npm run audit:quality` 確認沒漏

4. 寫進 fix-log

## 維護本檔

新場景發現「左改右沒改」→ 補進對應大類（A-H）。
每次 sync 不完整就是新場景、值得加進來。
