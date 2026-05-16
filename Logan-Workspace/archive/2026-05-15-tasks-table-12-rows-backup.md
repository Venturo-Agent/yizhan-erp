---
title: tasks 表歸檔備份（砍前 dump）
created: 2026-05-15
owner: Max
trigger: SSOT 盤點 4d、William 拍板「砍 tasks 表對齊」、要求先備份再刪
purpose: DROP TABLE 前永久保留 12 筆 row + schema + RLS policy 內容、不可逆動作必有書面
---

# tasks 表歸檔備份

## 為什麼歸檔

2026-05-15 狀態 SSOT 盤點發現 `tasks` 表跟 `todos` 表業務概念類似但 enum 不一致：
- `tasks.status`: `done / in-progress / todo`
- `todos.status`: `completed / in_progress / pending`

進一步調查確認：
1. `tasks` 表 12 筆全是 **2026-03-09 demo seed**（assignee 是 'Ethan'/'Nova'/'Matthew' 非真實 employee id）
2. `/api/tasks/create` route schema 跟表完全對不上（寫 `title` 但表是 `name`）、call 一次就炸、grep 無 caller
3. 真正在用的 Kanban 待辦是 `todos` 表

William 2026-05-15 拍板：**A — 砍 tasks 表 + 砍 route**

鐵律 #8「不刪 William 資料」要求：刪不可逆資料前要先備份歸檔。本檔即此備份。

## 12 筆 row 完整 dump

| id | name | status | assignee | due_date | progress | notes |
|---|---|---|---|---|---|---|
| 1 | 技術評估報告 | in-progress | Ethan | 2026-03-12 | 30 | 評估 HeyGen vs D-ID |
| 2 | 人設設計文件 | in-progress | Nova | 2026-03-15 | 10 | 定義 AI 數字人人格 |
| 3 | 應用場景清單 | in-progress | Nova | 2026-03-15 | 10 | 列出使用場景 |
| 4 | 跨部門會議 | todo | Matthew | 2026-03-11 | 0 | 3/11 14:00 會議 |
| 5 | 發送詢問給所有人 | done | Matthew | 2026-03-09 | 100 | 已完成 sessions_send |
| 6 | 收集回應 | done | Matthew | 2026-03-09 | 100 | 5/5 agent 回覆 |
| 7 | 彙整初步報告 | done | Matthew | 2026-03-09 | 100 | 報告已交付 |
| 8 | 建立資料表 | done | Matthew | 2026-03-09 | 100 | 4 個資料表完成 |
| 9 | 建立 RPC Functions | done | Matthew | 2026-03-09 | 100 | 2 個 functions 完成 |
| 10 | RLS 設定 | in-progress | Matthew | 2026-03-10 | 90 | 正在執行 |
| 11 | 測試資料寫入 | in-progress | Matthew | 2026-03-10 | 90 | 正在執行 |
| 12 | API 文件建立 | todo | Matthew | 2026-03-11 | 0 | 給 William AI 用 |

**workspace_id**: `a89335d4-85f1-492b-83c7-2476ab7c5d81`（初始 demo workspace）
**task_type**: 全部 `individual`
**workflow_template**: 全部 NULL
**created_at / updated_at**: 全部 `2026-03-09 01:53:04.786443`

## JSON 原始 dump（rollback 用、可貼回 INSERT）

```json
[
  {"id":1,"workspace_id":"a89335d4-85f1-492b-83c7-2476ab7c5d81","name":"技術評估報告","status":"in-progress","task_type":"individual","assignee":"Ethan","due_date":"2026-03-12","progress":30,"notes":"評估 HeyGen vs D-ID","workflow_template":null,"created_at":"2026-03-09 01:53:04.786443","updated_at":"2026-03-09 01:53:04.786443"},
  {"id":2,"workspace_id":"a89335d4-85f1-492b-83c7-2476ab7c5d81","name":"人設設計文件","status":"in-progress","task_type":"individual","assignee":"Nova","due_date":"2026-03-15","progress":10,"notes":"定義 AI 數字人人格","workflow_template":null,"created_at":"2026-03-09 01:53:04.786443","updated_at":"2026-03-09 01:53:04.786443"},
  {"id":3,"workspace_id":"a89335d4-85f1-492b-83c7-2476ab7c5d81","name":"應用場景清單","status":"in-progress","task_type":"individual","assignee":"Nova","due_date":"2026-03-15","progress":10,"notes":"列出使用場景","workflow_template":null,"created_at":"2026-03-09 01:53:04.786443","updated_at":"2026-03-09 01:53:04.786443"},
  {"id":4,"workspace_id":"a89335d4-85f1-492b-83c7-2476ab7c5d81","name":"跨部門會議","status":"todo","task_type":"individual","assignee":"Matthew","due_date":"2026-03-11","progress":0,"notes":"3/11 14:00 會議","workflow_template":null,"created_at":"2026-03-09 01:53:04.786443","updated_at":"2026-03-09 01:53:04.786443"},
  {"id":5,"workspace_id":"a89335d4-85f1-492b-83c7-2476ab7c5d81","name":"發送詢問給所有人","status":"done","task_type":"individual","assignee":"Matthew","due_date":"2026-03-09","progress":100,"notes":"已完成 sessions_send","workflow_template":null,"created_at":"2026-03-09 01:53:04.786443","updated_at":"2026-03-09 01:53:04.786443"},
  {"id":6,"workspace_id":"a89335d4-85f1-492b-83c7-2476ab7c5d81","name":"收集回應","status":"done","task_type":"individual","assignee":"Matthew","due_date":"2026-03-09","progress":100,"notes":"5/5 agent 回覆","workflow_template":null,"created_at":"2026-03-09 01:53:04.786443","updated_at":"2026-03-09 01:53:04.786443"},
  {"id":7,"workspace_id":"a89335d4-85f1-492b-83c7-2476ab7c5d81","name":"彙整初步報告","status":"done","task_type":"individual","assignee":"Matthew","due_date":"2026-03-09","progress":100,"notes":"報告已交付","workflow_template":null,"created_at":"2026-03-09 01:53:04.786443","updated_at":"2026-03-09 01:53:04.786443"},
  {"id":8,"workspace_id":"a89335d4-85f1-492b-83c7-2476ab7c5d81","name":"建立資料表","status":"done","task_type":"individual","assignee":"Matthew","due_date":"2026-03-09","progress":100,"notes":"4 個資料表完成","workflow_template":null,"created_at":"2026-03-09 01:53:04.786443","updated_at":"2026-03-09 01:53:04.786443"},
  {"id":9,"workspace_id":"a89335d4-85f1-492b-83c7-2476ab7c5d81","name":"建立 RPC Functions","status":"done","task_type":"individual","assignee":"Matthew","due_date":"2026-03-09","progress":100,"notes":"2 個 functions 完成","workflow_template":null,"created_at":"2026-03-09 01:53:04.786443","updated_at":"2026-03-09 01:53:04.786443"},
  {"id":10,"workspace_id":"a89335d4-85f1-492b-83c7-2476ab7c5d81","name":"RLS 設定","status":"in-progress","task_type":"individual","assignee":"Matthew","due_date":"2026-03-10","progress":90,"notes":"正在執行","workflow_template":null,"created_at":"2026-03-09 01:53:04.786443","updated_at":"2026-03-09 01:53:04.786443"},
  {"id":11,"workspace_id":"a89335d4-85f1-492b-83c7-2476ab7c5d81","name":"測試資料寫入","status":"in-progress","task_type":"individual","assignee":"Matthew","due_date":"2026-03-10","progress":90,"notes":"正在執行","workflow_template":null,"created_at":"2026-03-09 01:53:04.786443","updated_at":"2026-03-09 01:53:04.786443"},
  {"id":12,"workspace_id":"a89335d4-85f1-492b-83c7-2476ab7c5d81","name":"API 文件建立","status":"todo","task_type":"individual","assignee":"Matthew","due_date":"2026-03-11","progress":0,"notes":"給 William AI 用","workflow_template":null,"created_at":"2026-03-09 01:53:04.786443","updated_at":"2026-03-09 01:53:04.786443"}
]
```

## Schema 定義（砍前狀態）

```
public.tasks columns:
  id                  integer
  workspace_id        uuid
  name                text
  notes               text
  status              text          -- enum: done / in-progress / todo（跟 todos 不一致）
  task_type           text
  assignee            text          -- ❌ 非 FK、是 plain text 名字
  due_date            date
  progress            integer
  workflow_template   text
  created_at          timestamp without time zone
  updated_at          timestamp without time zone
```

## RLS Policy（砍前狀態、共 4 條）

```sql
-- tasks_select
CREATE POLICY tasks_select ON public.tasks
  FOR SELECT
  USING ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));

-- tasks_insert
CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT
  WITH CHECK (true);

-- tasks_update
CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE
  USING ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));

-- tasks_delete
CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE
  USING ((workspace_id IS NULL) OR (workspace_id = get_current_user_workspace()));
```

注：`tasks_insert` 用 `WITH CHECK (true)` 完全沒守門、是過去 demo 階段的寬鬆設定、本身也是技術債之一。

## 配套砍除

1. **DB**：`DROP TABLE public.tasks CASCADE` — migration `20260515300000_drop_tasks_demo_table.sql`
2. **API route**：`src/app/api/tasks/create/route.ts` — 60 行、dead API（schema 對不上、grep 無 caller）

route 內容備份：git history（最後 commit 含此檔、永久保留）。

## 為什麼可砍（紅線檢核）

| 紅線 | 檢核 |
|---|---|
| #8 不刪 William 資料 | ✅ 12 筆是 demo seed（assignee = Ethan/Nova/Matthew 非真實員工）、workspace_id 是初始 demo workspace、本檔已完整備份 |
| #2 review 先驗證 | ✅ grep 全 src、無 caller 動 tasks 表（除 dead route）、確認可砍 |
| API SSOT | ✅ /api/tasks/create 是 dead API、schema 對不上、call 一次必炸 |

## Rollback 步驟（萬一要救回）

1. 重建表 schema：
```sql
CREATE TABLE public.tasks (
  id integer PRIMARY KEY,
  workspace_id uuid,
  name text,
  notes text,
  status text,
  task_type text,
  assignee text,
  due_date date,
  progress integer,
  workflow_template text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);
```
2. 重建 RLS：複製上方 4 條 policy SQL 跑
3. 重建 ENABLE RLS：`ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;`
4. 把 JSON 內容轉成 INSERT（從上方 JSON dump）

## 砍除時間

- 備份完成：2026-05-15
- migration apply：等 William 拍板「動」後跑
- 此後永久保留本檔
