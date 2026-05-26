# Round 3 Audit — 2026-05-20 06:15

> 覆查員：Claude Opus 4.7（1M context）
> 對象：OPENCLAW Round 2 audit
> 紀律：找 Round 2 抓錯的、做唯一一條 100% 安全的修

---

## 救護車式總覽

| 項目                                     | Round 2 結論                     | Round 3 訂正                                                            | 動作                    |
| ---------------------------------------- | -------------------------------- | ----------------------------------------------------------------------- | ----------------------- |
| CIS 模組「3 page 存在 / 3 table 不存在」 | 半成品破洞、需補 DB 或砍前端     | **3 page 早就被砍光了、source 完全不存在**                              | ✅ 真相訂正、無 code 動 |
| Pre-existing tsc error 6 個              | 歷史殘留、commit 要 --no-verify  | **6 個全是 `.next/dev/types/validator.ts` stale 殘留、清掉 cache 即解** | ✅ 已修（清 cache）     |
| `departments` route 引用                 | 沒提（OPENCLAW 認為是真 module） | **跟 CIS 同類、source 不存在、stale cache 殘留**                        | ✅ 修法同上             |
| 紅線 B 1+3 處                            | 維持 Round 2 結論                | 維持                                                                    | ⏳ 等 William 拍板      |
| Bot module 不能清                        | 維持 Round 2 結論                | 維持                                                                    | ✅ 不動                 |
| salary_settlements guard                 | 維持 Round 2 結論                | 維持                                                                    | ⏳ 等 William 拍板      |

---

## Round 2 抓錯的：CIS / departments 模組「存在」的判斷錯誤

### Round 2 推論（有錯）

> 「`src/app/(main)/cis/[id]/page.tsx` — validator.ts:233（page 存在）」
> 「`src/app/(main)/cis/page.tsx` — validator.ts:242（page 存在）」

OPENCLAW 看到 `.next/dev/types/validator.ts` 引用就推論 source page 存在。

### Round 3 實況（清 grep）

```
find src -type f -name "*cis*"   → 0 個檔
find src -type d -name "cis*"    → 0 個目錄
grep -rEn "cis_clients|cis_pricing_items|cis_visits" src/   → 0 個 reference
ls src/app/api/departments       → No such file or directory
ls src/app/api/organization/departments  → No such file or directory
```

CIS / departments 兩個 module **早就被砍乾淨**、`.next/dev/types/validator.ts` 是 Next.js dev server build 時殘留的 stale 類型驗證器、未跟著 source 一起更新。

### 為什麼 OPENCLAW 抓錯

OPENCLAW Round 2 看到 validator.ts:233 引用 `'../../../src/app/(main)/cis/[id]/page.js'` 就以為 page 存在。**沒做反向驗證**（去 `src/` 真的找這個檔）。

### Claude Opus 為什麼也漏

我覆查 Round 2 報告時、被 SWR 健檢 Round 4 那條「CIS 3 個 page + 3 個 entity hook 存在、DB 沒對應 table」誤導、沒驗證 SWR 健檢的描述跟現況是否同步。**SWR 健檢是 5/19 寫的、5 月中 CIS 才被砍**（從 commit 看 `375bb0f feat(cis): 砍除 CIS 模組殘留 — 前端 + 7 個 SSOT 全清` — 5/19 commit）。

**結論：CIS 真相 = 5/19 早被砍乾淨、SWR 健檢 Round 4 寫完才砍的、之後沒人來訂正、Round 2 + Round 3 連環踩坑**。

---

## 修法：清 `.next/dev/types`

### 動作（已執行）

```
rm -rf .next/dev/types
```

### 驗證

```
$ npx tsc --noEmit
（無 error 輸出）
$ echo $?
0
```

### 影響

- ✅ TypeScript type-check 完全通過
- ✅ 未來 commit 不需 `--no-verify`
- ✅ 不動任何 source code
- ✅ `.next/dev/` 不在 git 追蹤（被 .gitignore 排除）、不會 commit 也不會推到別人

---

## 給 William 的決策清單（早上起床看）

整夜 audit 累積 6 個 P0 候選、其中：

- 1 個已解（tsc error、Round 3 處理掉）
- 1 個是純訂正（LINE bot 不能清、無事可做）
- **4 個需要你早上拍板才能動**：

### 決策 1 — `tour_control_forms.created_by` FK（紅線 B 確定違反）

**狀況**：團控表（旅遊團控管）紀錄「誰建這筆」、記成 Supabase 帳號 ID（auth.users）、應該記員工 ID（employees）。

**業務影響**：現在沒有業務影響、未來如果要查「Logan 建過哪些團控表」會查不到。

**修法**：

```sql
-- migration 草稿（不要直接跑）
ALTER TABLE public.tour_control_forms
  DROP CONSTRAINT IF EXISTS <auth_users_fk>,
  ADD CONSTRAINT tour_control_forms_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
-- 同樣處理 updated_by
```

**風險**：低 — 純 FK 改、不動 column、不動 data type。Apply 前可以先測 dev DB。

**建議**：上線前修。不急、可以排到月底。

---

### 決策 2 — `salary_settlements submit` 加 closed period guard

**狀況**：員工薪資結算的 submit API 沒有 check「這個 period 是不是已關帳」、所以員工可能 submit 已關帳的月份。

**業務影響**：

- 自己公司用：不會發生（員工不會故意作弊）
- 賣給 SaaS 客戶：**這是防作弊賣點**、必須做

**修法**：

```typescript
// src/app/api/hr/salary-settlements/[id]/submit/route.ts
// 大概在 PATCH/POST handler 開頭加
const period = await getAccountingPeriod(settlement.period_id)
if (period.is_closed) {
  return dbErrorResponse({ code: 'PERIOD_CLOSED' }, 409)
}
```

**風險**：中 — 動到 production 業務 logic、要先確認 `accounting_periods` 表結構跟 closed 判定方式。

**建議**：8/13 上線前必修。可排到 7 月。

---

### 決策 3 — image_library / file_system / email_system FK 業務語意 disambiguation

**狀況**：3 個表的 `created_by` 指 `auth.users(id)`、可能本來就對（如果是個人資料）、可能違反紅線 B（如果是業務資料）。

**業務影響**：取決於業務語意。如果這 3 個是「workspace 共用資料」、應該指 employees；如果是「user 個人物件」、指 auth.users 對。

**修法**：先做業務語意確認（看 API caller 怎麼用）、再決定改或不改。

**風險**：先 audit 無風險、實際改的話跟決策 1 同等級。

**建議**：跟決策 1 一起處理。

---

### 決策 4 — CIS 模組相關殘留清理

**狀況**：5/19 commit `375bb0f` 已經砍 CIS 前端 + 7 SSOT，但 `.next/dev` 殘留我們今天順手清了。**已乾淨**。

**業務影響**：無、已完全處理。

**建議**：無、收尾。

---

## Round 3 心得

### 我（Claude Opus）學到什麼

1. **OPENCLAW 看「.next 引用」就推論 source 存在、是錯的**。覆查時應該做反向驗證（去 src/ 找）、不能被「validator.ts 引用」誤導。

2. **SWR 健檢 Round 4 寫於 5/19 之前**、之後 CIS 被砍（commit `375bb0f`）但健檢檔沒更新。**舊文件變陷阱**、覆查時要對照 git log 確認檔案 freshness。

3. **OPENCLAW 跟 Claude Opus 連環踩坑**：OPENCLAW 看 validator.ts 推論、我看 SWR 健檢推論、兩個都是 indirect 證據、沒有一個做直接驗證（grep src/）。**這是 Round 2 應該抓的 Round 1 錯、但 Round 2 也沒抓、Round 3 才抓**。

### 給未來 audit loop 的紀律

- 每個「X 存在」claim 必須有 `find src/ -name X` 或 `grep -rn X src/` 證據
- 不准用 `.next/` / `dist/` / build artifact 當 source of truth
- 引用舊文件結論前必跑 git log 確認檔案 freshness

---

## Ratchet 維護機制（未來怎麼防再犯）

從這一輪起、每次新 audit 開工前必跑：

```bash
# Stale .next 清理（防 dev cache 污染 audit）
rm -rf .next/dev/types

# Audit 開工前 type-check baseline（確保沒被歷史 error 混淆）
npm run type-check
```

加進 `OVERNIGHT-PROGRESS-2026-05-20.md` Round 3 段。
