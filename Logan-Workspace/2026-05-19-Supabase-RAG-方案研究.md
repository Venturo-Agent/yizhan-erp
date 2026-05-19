---
date: 2026-05-19
author: Logan
status: 研究完、待 William 拍板開動或擱置
related:
  - 2026-05-18-AI-Hub-上線後複盤
  - 速記卡 commit e733d38 / 大型復盤 690a718 / 群組名 2753c5d
---

# Supabase RAG 方案研究

William 2026-05-19 凌晨要求研究「Supabase 有沒有 RAG 解決方案」。派分身掃官方 docs + 近期文章、結論：**很可行、很便宜、3-5 天能跑 MVP**。

## TL;DR

| 項目 | 選什麼 | 為什麼 |
|---|---|---|
| **Vector DB** | Supabase 原生 **pgvector**（不買第二套）| 跟現有 PostgreSQL 同 DB、RLS / FK / workspace_id 自動繼承、紅線 A 守得住 |
| **Embedding 模型** | **OpenAI text-embedding-3-small** 1536 維 | 繁中支援好、$0.02/M token、跟現有 dispatcher 容易整合 |
| **Index** | **HNSW**（cosine）| 2026 主流、ms 級搜索、recall@10 = 0.98 |
| **Auto-embedding** | **Supabase Automatic Embeddings**（pg_net + pg_cron + queue）| 新訊息進 DB 自動排隊 embed、不用 app 自己排程 |
| **MVP 時間** | **3-5 天** | 範本可照搬 freeacademy.ai / Supabase quickstart |
| **成本（William 規模 100 workspace / 250 萬訊息）** | **一次性 < NT$200 + 月 < NT$30** | LLM 計費瓶頸不在 embedding |

## 為什麼不選別的

- ❌ **Pinecone / Weaviate**：要付外部費用、要架第二套基建、跨 system 同步 schema 麻煩
- ❌ **Supabase Vector（獨立產品）**：跟 pgvector 是同件事、沒額外好處
- ❌ **Supabase.ai gte-small（內建免費 embedding）**：384 維、只支援英文、繁中爛、客服場景不能用
- ❌ **Self-host Ollama / HuggingFace**：要養 GPU、不划算（OpenAI embedding < NT$5 一次性）

## 架構（文字版）

```
[新訊息進 inbox_messages / 改 tours / 改 attractions]
        │  AFTER INSERT/UPDATE trigger
        ▼
[embedding_jobs queue (pgmq)]
        │  pg_cron 每分鐘批次取
        ▼
[Edge Function: generate-embedding]
        │  call OpenAI text-embedding-3-small
        ▼
[knowledge_chunks 表
   (id, workspace_id, source_table, source_id,
    chunk_text, embedding vector(1536), metadata jsonb)]
        │  HNSW index on (embedding vector_cosine_ops)
        ▼
[LINE Bot / AI 客服]
        │  客戶問問題
        │  → embed query → similarity top-8（RLS scoped）
        │  → 組 context → llm-dispatcher → 回答
```

## 表 schema 建議

```sql
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_table text not null,        -- 'inbox_messages' | 'tours' | 'attractions'
  source_id uuid not null,
  chunk_index int not null default 0,
  chunk_text text not null,
  embedding vector(1536),
  metadata jsonb default '{}',        -- {tour_id, customer_id, channel, sent_at, lang}
  created_at timestamptz default now(),
  unique (source_table, source_id, chunk_index)
);

create index on knowledge_chunks using hnsw (embedding vector_cosine_ops);
create index on knowledge_chunks (workspace_id, source_table);

-- RLS 走 setup_workspace_scoped_rls('knowledge_chunks')
```

關鍵：**單表 + workspace_id**、不要 per-workspace 一張表（100 表 / 100 index 維護爆炸）。

## 成本估算

| 項目 | OpenAI 3-small Standard | Batch（半價）|
|---|---|---|
| 一次性 backfill（250 萬訊息 ≈ 1.25 億 token）| **$2.50（NT$80）** | $1.25 |
| 月增量（每 workspace +1000/月 ≈ 5M token）| **$0.10/月（NT$3）** | $0.05 |
| 旅遊資料 backfill（5 萬筆 × 500 token = 25M）| **$0.50（NT$15）** | $0.25 |
| **DB 儲存** 250 萬 row × 1536 維 × 4 byte ≈ **15 GB** | Pro plan $25 內 80 GB 額度可吸收 | 同 |
| **HNSW index 記憶體** ~25 GB | Pro plan 8GB RAM 撐 ~80 萬 row、超過要升 Compute / partition / halfvec 砍半 | 同 |

**結論**：embedding 成本可忽略、瓶頸在 HNSW index 記憶體。100 workspace 規模到了再升級或 partition、初期完全沒事。

## 實作步驟

### Phase 1 — MVP（**3-5 天**、單一 workspace 跑通）

1. Migration：`CREATE EXTENSION vector` + 建 `knowledge_chunks` + HNSW index
2. Edge Function `generate-embedding`：call OpenAI API、key 走 secret env
3. RPC `match_chunks(query_embedding, p_workspace_id, match_count)`：cosine + workspace 過濾
4. 手動 backfill：`tours` + `attractions` + 最近 1 個月 `inbox_messages`（一次 script、< NT$30）
5. 接 LINE Bot：在 `line-llm-compose.ts` 前插 retrieval 步驟、塞 top-8 chunk 進 system prompt
6. 測 5-10 個真實客戶問題、看回答品質

### Phase 2 — Production（**1-2 週**）

1. 套 **Automatic Embeddings**（pgmq + pg_cron + trigger）— 新訊息自動 embed
2. `workspace_ai_settings` 加 `rag_enabled` 欄位、每 workspace 可選關
3. Hybrid search：cosine + full-text（PostgreSQL tsvector）混合排序（純語意搜不到「特定團名」）
4. `audit:realtime` 跑 RLS check、確認跨 workspace 不洩漏
5. 監控：embedding 失敗 retry、token 用量寫 audit log
6. 範本照搬：[freeacademy.ai RAG 教學](https://freeacademy.ai/blog/how-to-build-rag-chatbot-nextjs-supabase)

## 風險 / 限制

| 風險 | 影響 | 對策 |
|---|---|---|
| HNSW index 記憶體膨脹 | 250 萬 row 後 Pro plan 撐不住 | partition by workspace_id / halfvec 砍半 / 升 Compute |
| gte-small 繁中爛 | 客服場景不能用 | Phase 1 直接走 OpenAI、反正 < NT$200 |
| embedding stale | 改 tour 後檢索還用舊 embedding | Automatic Embeddings + updated_at 觸發 re-embed |
| 跨 workspace 洩漏（紅線 A）| 同電腦切帳號、SWR + RAG 雙洩 | match RPC 強制吃 auth.uid() 推 workspace_id、不接受 client 傳 |
| OpenAI key 外洩 | 機台帳單炸 | Edge Function 跑、key 只在 Supabase secret |
| PII 進 embedding（姓名 / 電話）| 刪客戶後殘留 | metadata 存 source_id、刪客戶時 cascade 刪 chunks |

## 接入點（既有 code）

| 檔案 | 改什麼 |
|---|---|
| `src/lib/ai/llm-dispatcher.ts` | RAG context 注入點 |
| `src/lib/ai/context-builder.ts` | 改成吃 retrieval 結果（取代 / 補充現有 tour list） |
| `src/lib/line/line-llm-compose.ts` | LINE Bot 串接位置 |
| `src/app/api/workspaces/[id]/ai-settings/route.ts` | 加 `rag_enabled` 欄位 |
| `supabase/migrations/` | 新 migration（vector extension + knowledge_chunks + RPC）|

## William 拍板的事

1. **要不要動 RAG**？（建議：**動、優先順位高、跟 1-對-1 AI 品質直接相關**）
2. **Phase 1 從哪個資料源先做**？（建議：tours + attractions、客人最常問行程細節）
3. **OpenAI 帳號**？需要 William 在 OpenAI 開 API key、放 `~/.config/venturo/secrets.env`
4. **跟速記卡 / 大型復盤的整合順序**？建議：先做 RAG MVP（最大價值）、速記卡頻率調 50 / 大型復盤可暫保留

## Sources（給 William 自己驗證用）

- [pgvector | Supabase Docs](https://supabase.com/docs/guides/database/extensions/pgvector)
- [HNSW indexes | Supabase Docs](https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes)
- [Automatic embeddings | Supabase Docs](https://supabase.com/docs/guides/ai/automatic-embeddings)
- [AI Inference on Edge Functions](https://supabase.com/blog/ai-inference-now-available-in-supabase-edge-functions)
- [Build RAG Chatbot with Next.js & Supabase](https://freeacademy.ai/blog/how-to-build-rag-chatbot-nextjs-supabase)
- [OpenAI text-embedding-3-small](https://platform.openai.com/docs/guides/embeddings)

---

Logan 2026-05-19 凌晨 04:15
