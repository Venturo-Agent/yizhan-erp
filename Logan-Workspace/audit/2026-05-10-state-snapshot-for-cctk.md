---
title: 2026-05-10 yizhan-erp 當前 state 快照（給 cctk session 校對用）
created: 2026-05-10
status: 動工中、cctk session 接手前看這份
---

# State Snapshot

> Logan 這邊 session 處理完一輪、已 push 到 origin。cctk session 看到「他那邊很多錯誤記憶」、以這份為準。

## origin/main 最新 commit

```
1b8a1df feat(db): Phase 2 patch — DB 層完全砍 is_super_admin / workspaces.type / platform.*
4cb2dcd docs(CLAUDE.md): 加新 session 接手前必看的 6 份卡索引
600def6 refactor(todos): 拆 page.tsx monster 檔（1189 → 813 行）
4f4661e refactor(hr): 抽 useBranches / useDepartments SWR hook
d27f742 refactor(hr): 統一 roles SWR hook、砍 useWorkspaceRoles 重複
21d267f refactor(permissions): code 層完全砍 workspace_type 概念
a02f549 refactor(permissions): 砍 api/workspaces 的 workspace.type 守門、改吃 tenants feature
b3c81f9 chore: 砍 18 個 _* 前綴 dead const
7d1febf chore: 砍 35 個過時 docs
6e1c903 refactor(permissions): callsite 改吃具體 capability、砍 is_super_admin RPC call
3770d10 feat(permissions): 砍 platform.is_admin 繞道路、統一吃 workspace_features + role_capabilities
```

## code 層當前狀態

- `platform.is_admin` reference：**0 處**
- `is_super_admin` reference：**0 處**（除了 supabase types.ts 自動生成的、那會跟著 DB regenerate 消失）
- `workspace.type` / `workspace_type` reference：**0 處**
- `PLATFORM_CAPABILITY_ROUTES` / `isPlatformCapabilityRoute`：**已砍**
- sidebar 統一吃 `workspace_features` + `role_capabilities`、沒有平台分流
- ModuleGuard 同上、沒有 isAdmin 判斷
- API routes：63 個都有守門、`/api/workspaces` GET 改吃 caller workspace 開了 tenants feature
- `/api/airports` POST 改吃 hasAdminCapability（hr.roles.write）、不再呼叫 is_super_admin RPC

## DB 層當前狀態（aawrgygqgemgqssflfrx）

Phase 2 patch 已 apply（commit 1b8a1df）：

- `is_super_admin()` function：**DROP 了**
- `workspaces.type` 欄位：**DROP 了**
- 14 處 RLS policy 改寫：砍掉 `OR is_super_admin()` bypass、純 workspace_id 守門
- `check_tour_member_modify_lock` trigger：砍 super_admin 救援、ongoing 團只允許領隊改團員
- `workspaces` 表 SELECT/UPDATE/INSERT policy：跨 workspace 條件改吃 tenants feature
- `role_capabilities` 表：砍 3 條 platform.* row（platform.is_admin / platform.workspaces.read / platform.workspaces.write）
- `role_capabilities` 表：加 2 條 workspaces.read / workspaces.write 給漫途 admin role（id `7829922c-dcdf-4d31-871a-d8780b8cfc52`）

## docs 層

- 砍 35 份過時 docs（yizhan-erp/docs/）
- 唯一保留的是 `docs/SECURITY.md`（已對齊新模型 + 加共用資料層概念）
- 規範散在 vault：圓桌結論卡 / 三維架構卡 / sitemap / gap report / Phase 2 重建規劃
- CLAUDE.md 加索引指 6 份必看卡

## 漫途 workspace_features 設定

```
dashboard: false
tours: false
orders: false
finance: true
accounting: true
database: true
hr: true
settings: true
calendar: false
todos: true
customers: true
line_bot: true
tour_attributes: false
tenants: true ← 漫途能管租戶
workspaces: true
kb_cruise: true
cis: true ← 漫途自家 CIS
platform_integrations: false ← AiToEarn 沒開
database.archive: false
database.suppliers: false
```

## 沒解的問題

1. **sidebar features cache vs server 不一致**（cctk session 在處理）
   - 一份在 server `workspace_features` 表
   - 一份在 browser localStorage
   - 重整時 sidebar 先讀 cache → 後讀 server、閃舊狀態
   - cctk session 的 fix：useLayoutContext.ts loading 公式拿掉 fast-path、features fallback 寫死空陣列
   - 這個 fix 還沒 push 到 origin（看上面 commit list 沒有）

2. **dogfood verify 待做**：等 cctk fix push + Coolify deploy 完、William 登入 https://erp.venturo.tw 看「租戶管理」menu 跟流程

## 給 cctk session 的提醒

- 動 useLayoutContext.ts 不會跟 Logan 這邊衝突（不同檔）
- 但 cctk push 前要 git fetch、確保 base 是 1b8a1df、不是更舊
- cctk push 完 Coolify auto-deploy
