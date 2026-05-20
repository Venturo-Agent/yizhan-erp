# Round 11 派工書 — 2026-05-20 09:10（剩餘 finding 真修復）

> 派工：Claude Opus
> 承辦：OPENCLAW Max（羅根）
> 模式：真修法、commit、不 push、Claude 覆查 + push
> William 拍板：「整夜 audit 出來的問題、不要只找原因、要實際修」

---

## 背景

Round 1-10 完成 audit + 部分修復。本輪做剩餘 5 個 finding 的真修：

| # | Finding | Source |
|---|---|---|
| 1 | knowledge_tags dead code 砍（0 caller、0 row）| Round 8 |
| 2 | 紅線 D guard 補 journal_vouchers / receipts refund / disbursement_orders | Round 8 |
| 3 | SWR ratchet 再清 5 個 baseline 檔（剩 146 處）| Round 6 ratchet 機制 |
| 4 | line_conversation_messages → inbox_messages 過渡期收尾（**僅 audit + 寫 migration 草稿、不真搬資料**）| Round 8 |
| 5 | knowledge_tags / 過渡期等的 cleanup migration 寫進 supabase/migrations/ | 補強 |

---

## 4 個 sub-task（自排順序）

### R11-1：砍 knowledge_tags（最簡單、先做）
- 寫 migration `YYYYMMDDHHMMSS_drop_knowledge_tags.sql` 內含 `DROP TABLE IF EXISTS public.knowledge_tags CASCADE;`
- BEGIN/COMMIT 包圍、reverse SQL 註解
- 不 apply（留 Claude 用 MCP 跑）

### R11-2：補紅線 D guard
查以下 API route、加 closed period check（仿照 Round 4 salary_settlements 寫法）：

- `src/app/api/accounting/receipts/[id]/refund/route.ts` — 退款不能對 closed period
- `src/app/api/accounting/journal-vouchers/.../route.ts` — 動 confirmed voucher 不可
- `src/app/api/disbursement-orders/.../route.ts` — 出納單關帳後不可改

模板：
```typescript
// 紅線 D guard
const { data: period } = await supabase
  .from('accounting_periods')
  .select('id, period_name, is_closed, closed_at')
  .eq('workspace_id', guard.workspaceId)
  .eq('period_name', xxx.period)
  .maybeSingle()

if (period && period.is_closed) {
  return NextResponse.json(
    { error: `此區間（${xxx.period}）已關帳、不能修改`, code: 'PERIOD_CLOSED' },
    { status: 409 }
  )
}
```

如果找不到對應 period 欄位、寫進 progress 「跳過、需 William 確認 schema」。

### R11-3：SWR ratchet 再清 5 個 baseline 檔
- 跟 Round 6 同模式：從 `.eslint-suppressions.json` 挑 5 個 count=1 低風險檔
- 改 supabase.from().insert/update → entity hook 寫法
- 跑 `npm run lint:swr-prune` 拔 entry
- 單一 commit

### R11-4：寫 line_conversation_messages 過渡期收尾 plan（純文件）
- 寫 `workspace/_meta/architecture/2026-05-20-line-conversation-transition-plan.md`
- 列：backfill 步驟、拔舊 caller 順序、最後 DROP TABLE 時機
- **不真執行** — 只寫 plan

---

## 紀律（同前）

- ❌ 不 push、不 --no-verify、不 as any、不動 .mcp.json
- ❌ 不 apply migration（Claude 走 MCP）
- ✅ type-check 必過、每個 sub-task 獨立 commit、commit message 標 Round 11

## 收工

寫 Round 11 段進 OVERNIGHT-LEARNINGS、最後 commit 標 `audit(round-11): 剩餘 finding 修法完成`、停手。

---

**看到「Round 11 繼續推進」立刻開工。卡住跳過、4 個做不完做 3 個也行。**
