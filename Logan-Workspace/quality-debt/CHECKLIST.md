---
title: QDF — PR / 新 feature 必檢查清單
created: 2026-05-15
status: active
owner: Logan
---

# Pull Request / 新 Feature Checklist

每個 PR / 新 feature 提交前 self-check。

## 🔒 安全 / 紅線

- [ ] **R1**：所有 mutation endpoint（POST/PUT/PATCH/DELETE）有 `requireCapability` 或 `getApiContext({capabilityCode})`
- [ ] **R3**：沒有 `if (isAdmin)` / `if (user.is_admin)` / `if (role === 'admin')` short-circuit
- [ ] **R4**：API error 走 `dbErrorResponse(error)` / `translateDbError(error)`、不直接 `return error.message`
- [ ] **R5**：不可逆 migration（DROP TABLE / DROP COLUMN with data / ALTER COLUMN TYPE）放 `supabase/migrations/_pending_review/`

## 💰 流程嚴謹（金流 endpoint 才需要）

- [ ] mutation 加 `recordApiAuditContext(supabase, { actorId, reason })`
- [ ] 改 status 用 SQL-level atomic filter `.update().eq('status', expected)`
- [ ] 多 step write 失敗時補償回滾（catch 內砍前面建的）
- [ ] 純預覽 endpoint（preview-/estimate-）可省 audit log

## 📅 資料一致

- [ ] 日期顯示走 `formatDate` 或 `formatDateTaipei`、不散刻 `toISOString().slice` / `toLocaleDateString`
- [ ] 金額顯示走 `formatCurrency` / `formatMoney`、不散刻 `toLocaleString`
- [ ] 狀態 label 走 `STATUS_LABEL_MAP` SSOT、不 hardcode 中文

## 🎨 UI 一致性

- [ ] Dialog：表單型 → `FormDialog`、確認型 → `ConfirmDialog`、多層 → `ManagedDialog`
- [ ] Page：列表 → `ListPageLayout`、內容 → `ContentPageLayout`
- [ ] Button 走 `Button` + variant、不 className 自製樣式
- [ ] Icon 走 lucide-react、不混用其他 icon lib

## 📚 文檔 / 可追溯

- [ ] 新 module 寫 spec.md 進 `Logan-Workspace/modules/`（套 _spec-template.md 10 段）
- [ ] migration 寫 Rollback 註解（critical 必要、其他可選）
- [ ] critical service（lib/hr / lib/disbursement / lib/finance）寫 unit test

## 🚦 跑 audit 確認

push 前必跑：

```sh
npm run audit:quality
npx vitest run
npm run type-check
npm run lint
```

紅線 metric 不可退步：
- audit:capability 未守：必須 0
- audit:flow 必修：必須 0
- audit:data 散刻：必須 0
- audit:spec：必須 100%
- audit:migration recent：必須 100%

長期改善 metric（不擋 merge、但要趨勢進步）：
- audit:ui Dialog SSOT：≥ 55%（目標 70%）
- 全 migration rollback：≥ 8.5%（目標 50%）

## 🗂 Migration / Schema 改動

- [ ] migration 檔名按時序：`YYYYMMDDHHMMSS_*.sql`
- [ ] migration 含 `BEGIN; ... COMMIT;` transaction
- [ ] 結尾加 `NOTIFY pgrst, 'reload schema';`（Supabase 用）
- [ ] critical 操作有 Rollback 註解
- [ ] 不可逆操作放 `_pending_review/`

## 🔐 鐵律對齊（紅線、絕對不准）

- [ ] **#6 不准 Vercel deploy**（一律 Coolify）
- [ ] **#8 不刪 William 檔案**（src/ 既有檔 / vault / 真實營運資料）
- [ ] **#9 沒有特權 / admin bypass**（三道閘門：feature + capability + RLS）
- [ ] **#11 API / secret 走 SSOT**（`~/.config/venturo/secrets.env`、不亂 grep .env）

## 🧪 跑完手動 smoke

UI / 前端改動：
- [ ] 起 production server 跑（`pnpm start`、不 dev）
- [ ] 走核心 flow：登入 → 進主要 page → 動作確認沒回歸
- [ ] 看 console 沒 error

API 改動：
- [ ] 用 curl / Postman / UI 觸發 endpoint、確認 response 對
- [ ] 看 supabase logs 沒錯
