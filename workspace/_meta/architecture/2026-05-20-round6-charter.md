# Round 6 派工書 — 2026-05-20 06:55（SWR ratchet 補做）

> 派工：Claude Opus
> 承辦：OPENCLAW Max
> 模式：補做 R5-1 SWR baseline ratchet（Round 5 跳過了）
> 重要：**lint:swr-prune 工具真的存在**、Round 5 OPENCLAW 誤判跳過、本輪補做

---

## 一、Round 5 跳過 R5-1 的真相訂正

Round 5 OPENCLAW 結論：「`lint:swr-prune` 不存在」。

實際：

```
$ grep "lint:swr-prune" package.json
"lint:swr-prune": "eslint --suppressions-location .eslint-suppressions.json --prune-suppressions ."
```

`lint:swr-prune` **是 npm script alias** 給 ESLint `--prune-suppressions` flag、不是獨立 .ts 檔。OPENCLAW 找 `scripts/lint:swr-prune.ts` 找不到、推論「不存在」、跳過。

訂正：**工具完全存在、可用、本輪補做 ratchet**。

---

## 二、你的任務（單一 sub-task）

### Sub-task R6-1：SWR baseline ratchet 5 個檔

**目標**：從 `.eslint-suppressions.json` 拔掉 5 個檔的 entry、baseline count 從 ~151 降到 ~145。

**做法**：

1. 讀 `.eslint-suppressions.json`、看當前 baseline
2. **挑選 5 個檔**、優先順序：
   - **`venturo/no-direct-supabase-writes` count=1 的小型檔**（單一 supabase write、改 1 處就完）
   - **避開 service layer 共用模組**（避免影響面大）
   - **避開 Round 4 改過的檔**（避免 conflict）
3. 對每個檔：
   - 看現有 `supabase.from('X').insert/update/delete(...)` 或直接 `useSWR(key, fetcher)` 呼叫
   - **改成 entity hook 寫法**：
     - 寫入 → `addX / updateX / deleteX from @/data/entities/X` 或 `apiMutate.x(...)`
     - 讀取 → `useX()` from entity hook
     - 寫入後 invalidate 走 `invalidateXxx()` from `@/data` 或 entity hook 內建
4. **每改完一個檔立刻驗證**：
   - 跑 `npm run lint -- <changed-file>` 確認該檔不再產生 warning
   - 跑 `npm run lint:swr-prune` 拔該檔 entry（會自動更新 `.eslint-suppressions.json`）
5. **5 個檔全做完**：
   - 跑 `npm run type-check` 必過
   - 跑 `npm run lint` 整體必過
   - **單一 commit**：`fix(swr): ratchet 清 5 個 baseline 檔 — Round 6`

### 卡住的處理

- 某個檔改不動（需要新建 entity hook、跨表 join 複雜）→ **跳過該檔換下一個**、不要強改
- 連續跳過 3 個 → 寫進 Round 6 audit「baseline 剩餘多是難改的、需要先擴 entity hook infra」

---

## 三、規矩（跟 Round 4/5 同）

- ❌ 絕對不 push、絕對不 apply migration
- ❌ 不准 --no-verify（type-check 還是綠）
- ❌ 不准 as any / mock data / git add -A
- ✅ 一個 commit 涵蓋 5 個檔（不要拆成 5 個 commit、用「集中 ratchet」）
- ✅ 跑 type-check + lint 必過

---

## 四、收工

寫 Round 6 段進 `OVERNIGHT-LEARNINGS-2026-05-20.md`：

- 修了哪 5 個檔（檔名 + 簡述改了什麼）
- baseline 從多少降到多少
- 哪些檔嘗試但放棄、原因

最後 commit 標 `audit(round-6): SWR ratchet 補做完成 — overnight 2026-05-20`、停手等 Claude Opus 覆查 + push。

---

**Round 5 已 push、production 健康。看到「Round 6 繼續推進」立刻開工。**
