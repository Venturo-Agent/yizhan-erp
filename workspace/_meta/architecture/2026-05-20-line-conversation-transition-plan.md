# line_conversation_messages → inbox_messages 過渡期收尾 Plan

> 撰寫：羅根（OPENCLAW Max）
> 日期：2026-05-20
> 狀態：純文件、不執行（待 William 覆查後執行）

---

## 背景

Round 8 audit 發現：

- `line_conversation_messages`（2024-04 建立）已無 UI caller
- 所有訊息收發已移至 `inbox_messages`（2025 Q3 上線）
- `line_conversation_messages` 只剩 0 行（migration 寫明），但 table schema 仍在 DB

---

## 現況 snapshot

| 項目                               | 狀態                                                           |
| ---------------------------------- | -------------------------------------------------------------- |
| `line_conversation_messages` table | 存在、0 rows                                                   |
| 舊 caller（2024 代碼）             | 已全數移除                                                     |
| 舊 API routes                      | 已無（`line/conversations/*` 只處理 metadata、不碰訊息 table） |
| `line_conversation_participants`   | 存在、0 rows（應一起處理）                                     |
| `line_conversation_overrides`      | 存在、有資料（需保留）                                         |

---

## 過渡期收尾步驟

### Phase 0：確認（不刪）

- [ ] `SELECT COUNT(*) FROM line_conversation_messages` → 預期 0
- [ ] `SELECT COUNT(*) FROM line_conversation_participants` → 預期 0
- [ ] `inbox_messages` 確定正常運作（LINE webhook → inbox_messages）

### Phase 1：確認無 caller（不刪）

- [ ] `grep -r "line_conversation_messages" src/` → 應無輸出
- [ ] `grep -r "line_conversation_participants" src/` → 應無輸出
- [ ] migration 確認：`20260510150000_line_conversation_overrides.sql` 有資料（LINE bot 特定 user 的訊息偏好）

### Phase 2：Backup（不刪）

- [ ] `pg_dump` 備份 `line_conversation_messages` + `line_conversation_participants`
- [ ] 備份至 `workspace/_meta/architecture/backups/`

### Phase 3：Drop（待 MCP apply）

```sql
BEGIN;

-- 先斷 FK
ALTER TABLE public.line_conversation_overrides
  DROP CONSTRAINT IF EXISTS line_conversation_overrides_conv_id_fkey;

-- 砍附屬 table（0 row、不影響資料）
DROP TABLE IF EXISTS public.line_conversation_participants CASCADE;
DROP TABLE IF EXISTS public.line_conversation_messages CASCADE;

-- overrides table 保留（LINE bot 偏好）：
-- content: "override_type" + "override_value"
-- 已驗證有實際資料（per 2026-05-10 migration）

COMMIT;
```

### Phase 4：types.ts cleanup（下次 regen 自動）

- 下次 `supabase gen types` → `line_conversation_messages` / `line_conversation_participants` 自動消失

---

## 執行順序（相對時間）

| 順序 | 動作                | 負責            | 風險                  |
| ---- | ------------------- | --------------- | --------------------- |
| 1    | Phase 0 確認        | 羅根            | 低                    |
| 2    | Phase 1 確認 caller | 羅根            | 低                    |
| 3    | Phase 2 backup      | 羅根            | 低                    |
| 4    | Phase 3 drop        | William（MCP）  | 中（需 William 在場） |
| 5    | Phase 4             | 下次 regen 自動 | 低                    |

---

## 特別備註

- **`line_conversation_overrides` 不要砍**：這個 table 是 2026-05-10 建立，有 LINE bot 特定 user 的訊息路由偏好資料
- 如果 Phase 3 需要更謹慎（例如 overrides 還有其他 FK），可以：
  ```sql
  -- 確認 overrides 只被一個 table 參考
  SELECT foreign_key_name FROM information_schema.table_constraints
  WHERE referenced_table_name = 'line_conversation_messages';
  ```

---

_此文件為純計畫、不執行任何 DB 操作。待 William 覆查後順序執行。_
