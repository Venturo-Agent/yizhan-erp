# 效能優化 — Supabase Performance Advisor 發現（2026-05-24）

> 來源：`mcp__supabase__get_advisors(type=performance)`、prod project `aawrgygqgemgqssflfrx`。
> 背景：William「繼續優化」。先盤點再動。

## 結論先講

**列表分頁的「好做的」已經做完了**：
- ✅ orders 列表 = server-side 分頁（`useOrdersListView`、`.or()` filter）
- ✅ tours 列表 = 分頁（`useToursPage`、pageSize）
- `usePaginated`（createEntityHook）已支援 page/pageSize/filter(eq+in)/search/單欄 sort。

**剩下的 效能 工作都不是「順手做」**：
1. 財務列表頁（請款/收款/出納）= 全撈 → 但**HARD**：分類靠模糊比對（request_type 含「薪資」）、「全部」tab 是 capability 聯集、自訂狀態排序（pending→confirmed→paid 非字母序、PostgREST `.order()` 表達不了）。要先補乾淨的分類 enum 欄位 + status_priority 欄位 + 擴充 usePaginated（複合排序 / NOT / IS NULL / OR）。是 schema + 細活、且 William 難驗。
2. DB 層 perf（見下）。

## Advisor 五類（prod 實測）

| 類型 | 數量 | level | 評估 |
|---|---|---|---|
| **auth_rls_initplan** | 46 | WARN | **最高價值**：RLS policy 內 `auth.<fn>()` / `get_current_user_workspace()` **逐列重算**、應改 `(select …)` 只算一次。影響每張表每次查詢。semantics-preserving（只改何時算、不改算什麼）。但動 RLS = 資安層（紅線 A、4/20 登入事故風險）。46 policy 跨 ~35 表、混 setup_*_rls 程序生成 + 手寫（anon_by_token / ref_* / inbox_*）。 |
| unindexed_foreign_keys | 127 | INFO | FK 沒覆蓋索引。但同時有 122 unused index = 已 over-index。盲加 127 個會惡化寫入。要挑「真的常 JOIN/filter 的大表 FK」加、judgment-heavy。 |
| unused_index | 122 | INFO | 沒被用的索引（拖慢寫入 + 佔空間）。但 DB 新、查詢歷史少 →「unused」不可靠（可能只是還沒被查到）。**現在 drop 風險高**、不動。 |
| multiple_permissive_policies | 40 | WARN | 同表同 action 多條 permissive policy、每條都要查。合併可加速。中價值。 |
| duplicate_index | 4 | WARN | 完全重複的索引。drop 安全（另一條相同的還在）。小而乾淨。 |

## auth_rls_initplan 受影響表（前段）
timebox_scheduled_boxes(4)、categories(4)、receipts(2)、order_status_logs(2)、invoices(2)、inbox_messages(2)、inbox_conversations(2)、inbox_conversation_notes(2)、audit_logs(2)、workspace_*_settings(各1)、ref_*(各1)、employees(1)、branches(1)、payment_request_items(1)、notes(1)…

## 修法（SSOT-correct）
1. 更新 3 個 `setup_*_rls` 程序：把 `get_current_user_workspace()` 等包成 `(select …)`。
2. 對所有走程序的表 re-run 程序（regenerate policy、一致）。
3. 手寫 policy（anon_by_token / ref_* / inbox_*）個別改。
4. **必跑** `tests/e2e/login-api.spec.ts` + `tests/e2e/cross-tenant.spec.ts`（資安回歸）。
5. re-run advisor 確認 46 → 0。

## 重要脈絡：現在 DB 流量低
- 122 unused index 證實查詢歷史少 = 還沒到規模。
- auth_rls_initplan 是「**at scale** 才痛」的優化 = 投資人級「我們的 RLS 為 planner 優化、規模化不卡」、但**今天不緊急**。

## 建議優先序（給 William）
1. **auth_rls_initplan**（flagship、scales-every-query、semantics-preserving、可用登入/跨租戶測試證明安全）— 但動資安層、要 William 點頭再大改 46 policy。
2. duplicate_index drop（4、安全小win）。
3. 財務列表分頁（HARD、需 schema、獨立 session）。
4. FK 索引（挑大表熱路徑、不盲加）。
5. multiple_permissive_policies 合併。
