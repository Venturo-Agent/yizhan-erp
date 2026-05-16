---
title: 安全 findings v2 — hardcoded UUID 紅線
created: 2026-05-16
status: 待 W 拍板修補方向
related: [[01-safety-findings]] [[01-safety-blueprint]]
---

# Hardcoded UUID Finding（2026-05-16 audit:hardcoded-id）

對齊鐵律 #9「沒有特權、沒有 hardcode workspace 判斷」。

## Baseline

audit:hardcoded-id 跑出 10 個 finding：
- 6 個真實紅線（跟鐵律 #9 衝突）
- 4 個合理例外

## 真實紅線（6 處）

### CORNER_WORKSPACE_ID（3 處）
漫途自己的 workspace UUID `8ef05a74-1f87-48ab-afd3-9bfeb423935d` hardcode 在：
- `src/app/(main)/library/attractions/_components/AttractionsPage.tsx:20`
- `src/app/api/tenants/create/route.ts:37`
- `src/app/api/workspaces/[id]/route.ts:11`

**用途**：漫途自己當「平台主 workspace」、防止砍掉自己 / 給 attractions module 特例。

**問題**：違反「沒有 hardcoded workspace 判斷」（鐵律 #9）。

**建議修法**：
- A. 加 workspace.is_platform boolean、不 hardcode UUID（要 migration + UI）
- B. 移到 env：`PLATFORM_WORKSPACE_ID` 環境變數、減 source code 暴露
- C. 走 feature flag：`workspaces.platform_features.enabled`、純走三道閘門

選 B 最簡（不動 schema、不破鐵律 #9）、之後可重構 C。

### SYSTEM_BOT_ROLE_ID（3 處）
系統 bot role UUID `53fd15df-a256-4a55-870d-0d59810fdddf` hardcode 在：
- `src/lib/facebook/setup-pipeline.ts:40`
- `src/lib/instagram/setup-pipeline.ts:16`
- `src/lib/line/setup-pipeline.ts:24`

**用途**：bot 整合 setup 時把「bot」當虛擬員工、需要對應 role_id。

**問題**：跨 workspace 用同一個 role_id、實際上每個 workspace 應該有自己的 role。

**建議修法**：
- 把 `SYSTEM_BOT_ROLE_ID` 改成 lookup：每 workspace 查 `workspace_roles where is_system_bot=true`
- 沒 row 自動建一個

## 合理例外（4 處）

### Sentinel UUID（1 處）
`src/app/api/disbursement/[id]/route.ts:198`：
```ts
.in('id', finalItemIds.length > 0 ? finalItemIds : ['00000000-0000-0000-0000-000000000000'])
```
**理由**：`.in('id', [])` 會炸、用 zero UUID 當 sentinel。
**改進**：加 `// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- sentinel UUID` 註解

### UUID generator template（3 處）
`'10000000-1000-4000-8000-100000000000'.replace(...)` 用於 generate v4 UUID
- src/hooks/useTodos.ts:35
- src/lib/utils/uuid.ts:14
- src/stores/core/create-store.ts:43

**理由**：fallback UUID generator（crypto.randomUUID 不可用時）
**改進**：抽 SSOT lib/utils/uuid.ts、其他兩處 import

## 下輪修補規劃

### Phase 1（半天）
- 加 `PLATFORM_WORKSPACE_ID` env 變數到 `.config/venturo/secrets.env`
- 3 處 `CORNER_WORKSPACE_ID` 改 `process.env.PLATFORM_WORKSPACE_ID`

### Phase 2（一天）
- migration 加 `workspace_roles.is_system_bot` flag
- 把 SYSTEM_BOT_ROLE_ID lookup 改 query
- 移除 hardcode

### Phase 3（小事）
- sentinel UUID 加 eslint-disable
- UUID generator 抽 SSOT、其他兩處 import

## Audit 規則升級

audit:hardcoded-id 之後升級：
- 識別「合理 sentinel」pattern（zero UUID + 註解）
- 識別「UUID generator template」（含 `.replace()` 之後跟）
- 識別「test fixture UUID」（已加進 EXCLUDED）

## 不在這次修

紅線 finding 全寫進 spec、實際修補要 W 拍板（涉及 schema 改 / env 變動）。
