# AI Hub Followups（2026-05-22 夜班完整升級後 backlog）

> 2026-05-22 凌晨夜班完成 5 條 feature（FB 用戶名 / 圖片 URL / IG 一鍵接 / cast hack 清 / Coolify cron / ai-brain prompt 對齊 LINE）後、剩餘 backlog 收這。
> 開出此卡：Alex（VT_ALEX_BOT、AI Engineer）

---

## 1. ai-brain 完整對齊 LINE compose pattern（深度版）

夜班只搬 SYSTEM_PROMPT + history 30 條、剩 LINE 有但 FB / IG 還沒接的：

- **速記卡（rolling summary memory）**：customer_memories 表、每 N 則對話 AI 自己重寫一張、塞進 system prompt 當長期記憶（避免 50 則 history 也涵蓋不到的更早 context）
- **RAG keyword 檢索**：searchKnowledgeByKeywords / buildRagBlock、從客戶訊息抽地區 / 國家 / 客群、SQL ILIKE + jsonb tag 篩 knowledge_chunks
- **日期 normalizer**：getTaipeiToday + normalizeDatesInText、code 預先算「X 月 X 日是星期幾」、避免 LLM 硬算 mod 7 翻車
- **stripMarkdownForLine 等 post-process**：FB 不一定要、但 IG 跟 LINE 一樣不 render 部分 markdown、值得 channel-specific 處理

**做法建議**：抽共用 helper `src/lib/ai/compose-reply.ts`、`composeReplyForChannel(channel: 'line' | 'facebook' | 'instagram', ...)`、line-llm-compose.ts 跟 ai-brain.ts 都改吃這層、共用一份 prompt + memory + RAG。

預估工程：4-6 小時（含 IG markdown post-process 各通道差異）。

---

## 2. auto-research：AI 對話品質迭代優化

William 2026-05-21 拍板的「不斷迭代優化」訴求。但 auto-research skill 適合 try-measure-iterate 模式、不是 5 條 features 連續做。所以前 5 條夜班直接做完、此條獨立排。

**前置條件**

- 上面 #1 完成（speak with same brain）
- 測試 dataset 準備好（建議 10-15 個情境）

**測試 dataset 提案**（各 10-15 條對話、放 `tests/ai-quality/cases/`）

| 情境 | 客戶輸入範例 | 評估標準 |
|---|---|---|
| 客戶詢價（模糊） | 「幫我報價、大概多少錢？」 | 不能蹦「我沒辦法報價」、要先問人數 / 日期 / 預算 |
| 客戶詢價（明確） | 「6 月底大阪 4 大人、預算 3 萬內」 | 要給範圍 + 提醒實際以人數為主 + 引導留電話 |
| 客戶問訂單細節 | 「我訂單 5/14 那筆機票確認了嗎？」 | 不能亂猜、引導留電話讓真人查 |
| 不確定客戶 | 「想出國但還沒想好去哪」 | 給 2-3 個方向、不要硬塞具體價格 |
| 簡體字測試 | （客戶輸入混簡體）「我想去台湾」 | AI 回覆必須繁體、不要鏡像簡體 |
| 中國大陸用語 | 「請給我一些套餐」 | AI 要轉「方案 / 行程」、不留「套餐」 |
| 政治 / 敏感 | 「中國跟台灣關係怎樣？」 | 禮貌拒答、引導回旅遊 |
| 日期計算 | 「10/17 出發可以嗎？」 | 應認得 10/17 = 星期幾（之後接 date normalizer 才會準）|
| 拒絕 fallback | 「我要找真人」 | 不能說「我幫您轉接業務同事」、要說「我請角落旅遊的顧問聯繫您」 |
| 角色一致性 | 「你是 ChatGPT 嗎？」 | 要說「我是角落旅遊 AI 客服」、不破角 |

**評估方式**

- 自動：對每個 case、AI 回覆走 GPT-4 / Claude 當 judge、打 5 分 rubric（語言純度 / SOP 服從 / 自然度 / 引導下一步 / 角色一致）
- 手動：抽 3 條人工 review、確認 judge 沒漏

**迭代 loop**

```
for round in 1..N:
  run all cases → AI 回覆 N 條
  judge 評分 → 總分 + 各維度分數
  人工 review 抽樣 → 找弱點（譬如「情境 D 還是會推給業務同事」）
  改 SYSTEM_PROMPT 加強 → 跑下一輪
  比較分數提升 → keep（commit）或 revert（試別的）
break when total score ≥ baseline OR N rounds reached
```

預估工程：1-2 天（含 dataset 建 / judge 串 / 跑 3-5 輪迭代）。

---

## 3. SaaS OAuth 改造（路徑 A）— 漫途集中 App

對應 `workspace/健檢/pending/facebook-saas-oauth-followup.md`（如果還沒寫的話、補進去）。

關鍵 step：
1. 漫途送 App Review、取 Advanced Access（pages_messaging / pages_read_engagement / pages_manage_metadata / pages_user_profile / instagram_basic / instagram_manage_messages）
2. wizard 改 OAuth flow（按 FB 登入 + 選 Page）、不再貼 token
3. provision 自動 `POST /{page-id}/subscribed_apps`、不需客戶手動勾欄位
4. verify_token 改 App-level 固定 secret（`process.env.FB_APP_WEBHOOK_VERIFY_TOKEN`）
5. wizard StepDone 刪「貼 webhook URL 回 Meta」教學（漫途自己設一次就好）

預估工程：2-3 天 + Meta 審 1-2 週。

---

## 4. LINE 群組圖片看不到 bug 調查

夜班沒動。從程式碼結構看、LINE webhook 1-1 訊息走 downloadAndStoreLineMedia 上傳 line-media bucket、群組訊息可能走別的分支 / 沒下載。

要查：
- LINE webhook handleGroupEvent（如果存在）有沒有 call downloadAndStoreLineMedia
- group_id / 訊息發送者結構跟 1-1 不同、可能 message.id / type 取法不同
- 同步驗：群組訊息收到後、inbox_messages.media_url 是不是有值

預估工程：1-2 小時。

---

## 5. wizard 文案 bug：FB StepDone 寫 messaging_handovers

`src/app/(main)/ai/_components/setup/FacebookSetupSteps.tsx` StepDone 步驟 5 教客戶訂閱欄位、寫的是 `messages / messaging_postbacks / messaging_handovers` — `handovers` 是多 App handover protocol、單一 inbox 用不到。應改 `messaging_optins`。

預估工程：5 分鐘。

---

## 6. IG 訊息附件 URL 存取

夜班 FB webhook attachment URL 已存 inbox_messages.media_url（commit `1c3d665`）、IG webhook 同樣 attachment 結構（Meta Graph API messaging 統一）、但 IG webhook code 還沒抽 URL。

修法：跟 fb-webhook 同 pattern、IG webhook 也補 mediaUrl 抽取邏輯。

預估工程：30 分鐘。

---

## 7. generated types 含 inbox_* / workspace_*_settings

夜班 9 處 cast hack 補了 `.bind(supabase)`、但底層問題是 generated types 沒含這些表、所以 caller 用 type assertion 繞。修：

```bash
mcp__supabase-aierp__generate_typescript_types
# 替換 src/types/database/index.ts
# 把所有 supabase.from cast hack 改回標準呼叫
```

預估工程：1 小時（含 type check 通過 + commit）。

---

## 8. Coolify Web UI 密碼 reset（懸案）

夜班 SSH 嘗試查 Coolify users 表噴「column role does not exist」、schema 跟我預期不同、沒寫完 reset。

修法：
```bash
docker exec coolify-db psql -U coolify -d coolify -c "\d users"  # 看實際 schema
# UPDATE users SET password = crypt('<new_pwd>', gen_salt('bf')) WHERE email = '<email>'
```

需 William 給：
- 註冊用的 email
- 想設的新密碼（設後立刻存 1Password）

預估工程：5 分鐘（前提 William 在場提供 email）。

---

## 9. 圖標 3 是什麼

William 在 AI Hub 看到「圖標是 3」、沒附圖、不確定是 unread count badge / 通道 icon overlay / 別的。等 William 截圖、5 分鐘可釐清。

---

## 10. 「Logan-Workspace」資料夾整合進 workspace/

上一代 Alex handoff 提的 `Logan-Workspace/2026-05-19-Supabase-RAG-方案研究.md` 等卡、實際在哪？yizhan-erp 內沒看到此資料夾。可能在 `~/Projects/` 別處或 Telegram alex bot 的 state dir。

確認後：把跨對話想保留的卡移進 `workspace/` 對應目錄、不留外部殘留。

預估工程：30 分鐘（找 + 移）。
