# P0-4 Proposal — CI 加 audit:writes 守門

> 對應 Pass 2 P0-4 / DELIVERABLE 真痛點 #4
> 影響：trigger × API 雙寫撞 unique 事故（5/14 onboarding 那種）會被自動擋下
> 預估工時：5 分鐘

---

## 現況確認（我親自跑 grep）

✅ `audit:realtime` **已經在 CI**了（`.github/workflows/audit-rls.yml:39-40`）
❌ `audit:writes` **沒在 CI**、是真缺口

修法只需加 `audit:writes` 一個 step。

---

## 修法 — `.github/workflows/audit-rls.yml` diff

**before（現況）**：

```yaml
- name: Run blueprint audit
  env:
    SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
  run: npm run audit:rls

- name: Realtime publication audit (code-only, no DB needed)
  run: npm run audit:realtime
```

**after（加 1 個 step）**：

```yaml
- name: Run blueprint audit
  env:
    SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
  run: npm run audit:rls

- name: Realtime publication audit (code-only, no DB needed)
  run: npm run audit:realtime

- name: Write paths audit (code-only, 5/14 onboarding 撞號事故防護)
  run: npm run audit:writes
```

---

## 風險評估

| 維度     | 評估                                      |
| -------- | ----------------------------------------- |
| 影響行數 | +3 行 yaml                                |
| 可逆性   | 完全可逆（revert commit 即可）            |
| 副作用   | CI 跑 grep 多 1-2 秒、無 DB 連線、無 cost |
| 觀感     | 不會影響開發者本地、只在 PR / push 時跑   |

---

## 副作用 / TODO

跑後可能會發現 production 已有 violation（如果 ALLOWLIST 不完整）。
建議：

- 先在 main branch run 一次看現況
- 如果出 fail、可能要把已知合理雙寫加進 `scripts/audit-write-paths.ts` 的 `ALLOWLIST`
- 已知 ALLOWLIST 條目（從 script 抓的）：channel_members / journal_lines

---

## 套用方式（明天 William approve 後）

```bash
# 1. 開 .github/workflows/audit-rls.yml
# 2. 在 line 40 之後加：
#    - name: Write paths audit (code-only, 5/14 onboarding 撞號事故防護)
#      run: npm run audit:writes
# 3. git add .github/workflows/audit-rls.yml
# 4. git commit -m "ci: 加 audit:writes 到 audit-rls workflow — 防 trigger × API 雙寫"
# 5. git push（如果 William 授權）
# 6. main branch CI 會跑一次、有 fail 就看 ALLOWLIST 要不要加
```

---

## 來源證據

- script 註解：`scripts/audit-write-paths.ts` 開頭說明
- package.json: `"audit:writes": "tsx scripts/audit-write-paths.ts"`
- script ALLOWLIST 已含 channel_members + journal_lines

---

_作者：Claude Opus 4.7、2026-05-20、為 William 把關 P0 修法_
