# Pass 2 派工書 — SWR/Realtime 對錯判斷 — 2026-05-20

> 派工人：William（透過 Claude Opus 4.7 中介）
> 承辦：OPENCLAW（agent: main、人格 Max、model: MiniMax-M2.7）
> 任務性質：**對 Pass 1 全部 72 entries 做對錯判斷**

---

## 為什麼 Pass 2

Pass 1 完成（72 個頁面/組件已盤點 5 欄位），但 Pass 1 紀律是「只盤不判」。
Pass 2 必做：每筆判斷 ✅合規 / ❌違規 / ⚠️模糊。

判斷標準三條：
- **紅線 F**：讀資料走 `createEntityHook`、寫入走 `apiMutate` 或 `invalidateXxx()`
- **紅線 G**：SWR cache key 帶 user_id（防跨帳號污染）
- **5/19 SWR 健檢 ratchet baseline**：158 處 baseline，新增不准

---

## 任務範圍

讀進 `2026-05-20-swr-realtime-page-audit-pass1.md`（74 行表格 row），對每一筆：

1. **判斷讀（read）正不正確**
   - ✅ entity hook → 合規
   - ⚠️ useSWR 但屬 B 類（複雜跨表 join、code→id fetch、AI conversation）→ 條件式合規
   - ❌ useSWR 散刻純表名 / 直接 supabase.from → 違規

2. **判斷寫（write）正不正確**
   - ✅ apiMutate / invalidateXxx → 合規
   - ⚠️ apiMutate 但沒 invalidate（譬如 fire-and-forget POST）→ 條件式合規
   - ❌ 直接 supabase.update / supabase.insert / 散刻 mutate('字串') → 違規

3. **判斷 Realtime 該不該有**
   - 即時資料（訊息、訂單狀態、團員狀態）→ 該有
   - 報表 / 設定 / 靜態資料 → 不必
   - 該有但 publication 缺 → ❌
   - 該有且 publication 有 → ✅
   - 不必 → 標 N/A

4. **smoking gun 標記**
   - 對「現在就會炸」「user 抱怨直接相關」「資料 stale 高機率」的 → 標 🔴
   - 對「設計上不對但目前沒人用」 → 標 🟡
   - 對「不確定要不要修」 → 標 ⚠️

---

## 必讀 Pass 1 報告

路徑：`workspace/_meta/architecture/2026-05-20-swr-realtime-page-audit-pass1.md`

裡面的 25 個模組分區、74 筆 row 全部要判斷。**不准跳過、不准標「待掃」**。

如果 Pass 1 中某筆寫「未讀」「待補讀」「delegate（未讀）」之類、本輪要去把它讀完整。

---

## 品質要求（Pass 1 我抓到你的毛病、這輪必達）

1. **跟 hook 走完整**：列「✅ entity」之前、要進 src/data/entities/{xxx}.ts 確認該 hook 真的是 createEntityHook 產的、有 useRealtimeSync
2. **跟 handler 走完整**：寫入點不只列 invalidate 名、要進 handler 看 invalidate 是 await 還是 void、optimistic update 有沒有
3. **delegate 鏈完整**：page.tsx delegate to XxxPage.tsx 的、要進 XxxPage.tsx 看
4. **不准猜不存在的 file**（CIS 教訓）

---

## 產出格式

### 主檔：`workspace/_meta/architecture/2026-05-20-swr-realtime-page-audit-pass2.md`

```markdown
# Pass 2 — SWR/Realtime 對錯判斷 — 2026-05-20

## 救護車式總覽
| 判決 | 數量 | 備註 |
|---|---|---|
| ✅ 合規 | N | |
| ⚠️ 條件式合規 | N | |
| ❌ 違規 | N | |
| 🔴 smoking gun | N | 立即可修 / 直接相關 user 抱怨 |

## 違規清單（依嚴重度倒排）

### 🔴 P0 立即修
| # | 路徑 | 違反 | 問題 | 修法 |
|---|---|---|---|---|
| 1 | `accounting/vouchers/page.tsx` | F | 讀寫都繞 entity hook、無 realtime | 補 useJournalVouchers entity hook |
| ... |

### 🟡 P1 短期修
| ... |

### ⚠️ P2 待討論
| ... |

## 模組分區判決（每個 module 一節、對應 Pass 1 章節 1-25）

### 1. channels（4 entries）
| 路徑 | 讀判決 | 寫判決 | Realtime 判決 | 整體 | smoking gun |
|---|---|---|---|---|---|
| `channels/page.tsx` | ✅ | N/A | ✅ | ✅ 合規 | — |
| ... |

（依此類推 25 個模組）

## 統計
| 模組 | 合規 | 違規 | smoking gun |
|---|---|---|---|
| ...

## 給 Claude 的提醒
- 重大誤判風險點
- 我這輪深入 hook/handler 多少完整度
- 哪些頁面 P2 我不確定該怎麼判
```

### 心得：直接 append 到 `PASS1-LEARNINGS-2026-05-20.md`（追加段「Pass 2 反思」）

---

## 紅線（跟前兩輪一樣）

- ❌ 不准 git push
- ❌ 不准 --no-verify
- ❌ 不准動 code / migration
- ❌ 不准猜不存在的 file
- ❌ 不准跳判決（每筆都要判）
- ✅ 完成 commit：`audit(swr-pass2): SWR/Realtime 對錯判斷完成 — 2026-05-20`

---

## 開工指令

第一個 message 看到「**PASS2-START**」三字 = 正式開工。
回我「**收到、開始讀 Pass 1 報告 + 對 74 筆做判決**」就行。

預估時間：1-2 小時。期間 30 分鐘 commit 一次階段性。
