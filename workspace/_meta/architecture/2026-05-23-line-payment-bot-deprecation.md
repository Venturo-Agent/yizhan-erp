# venturo-line-payment-bot 標記為 deprecated

> 2026-05-23 William 拍板：把 line-payment-bot 程式碼合併進 ERP、舊 repo 不再維護
>
> ⚠️ Alex 在 ERP 內無法存取 `~/Desktop/venturo-line-payment-bot/`（macOS TCC 擋）、
> 下面動作 William 需手動執行或讓另一隻 bot（Logan / Max / Robin）有 Desktop 存取權的處理。

---

## 已搬的東西

- `~/Desktop/venturo-line-payment-bot/src/utils/sinopac.js`
  → `src/lib/payment-providers/sinopac/crypto.ts`（TypeScript、加 unit test）

涵蓋函式：
- `generateHashID(h1, h2, h3, h4)` — SHA-256 取前 32 碼
- `generateSign(message, nonce, hashID)` — 訊息 Sign 產生
- `encryptMessage(obj, hashID, nonce)` — AES-256-CBC 加密
- `decryptMessage(hex, hashID, nonce)` — 解密
- `sortObjectKeys(obj)` — 遞迴 key 排序

---

## 還沒搬的（Phase 2 才需要）

- `~/Desktop/venturo-line-payment-bot/src/services/sinopac.js`
  - getNonce() — 60 秒一次性 nonce 從永豐拿
  - 建虛擬帳號訂單 API call
  - webhook handler

Phase 2 接真實永豐 UAT 時、Alex 會把 `src/lib/payment-providers/sinopac/epos.ts` + `collect.ts` 寫出來、把上面這些邏輯也搬進來。

---

## William 該做的（手動執行）

### 1. 在舊 repo 加 DEPRECATED 標示

```bash
cd ~/Desktop/venturo-line-payment-bot

# 在 README 開頭加 deprecation notice
cat > /tmp/notice.md <<'EOF'
# ⚠️ DEPRECATED — 2026-05-23

此 repo 已合併進 venturo-erp（yizhan-erp）、不再維護。

## 程式碼搬遷對照

| 舊位置 | 新位置 |
|---|---|
| src/utils/sinopac.js | yizhan-erp/src/lib/payment-providers/sinopac/crypto.ts |
| src/services/sinopac.js | （Phase 2 接永豐 UAT 時搬到 yizhan-erp/src/lib/payment-providers/sinopac/epos.ts） |

## 為什麼合併

- 不要兩個 repo 並存（紅線 #7：同類資源存兩份）
- AI Hub / LINE / FB / IG bot 都共用一條 sinopac 模組
- 維護成本降低

---
EOF

cat /tmp/notice.md README.md > /tmp/new-readme.md
mv /tmp/new-readme.md README.md

git add README.md
git commit -m "chore: mark deprecated, merged into yizhan-erp"
git push
```

### 2. 不要刪 repo

保留歷史 commits、未來查程式碼演進方便。

### 3. 確認 production / Coolify 沒有跑這個 bot

如果以前有部署這個 bot 到 production server、現在要停掉、避免：
- 兩邊 webhook 都收（撞單）
- 客戶 confusion

```bash
# Coolify 上找 line-payment-bot app、停掉
# 或 ssh server 看有沒有 PM2 / systemd 跑這個服務
```

---

## ERP 內檔案位置（已建好）

```
src/lib/payment-providers/sinopac/
├── crypto.ts            ← 加解密 lib（已搬完）
├── epos.ts              ← Phase 2 寫（信用卡 URL 付款頁）
├── collect.ts           ← Phase 2 寫（豐收款虛擬帳號）
├── config.ts            ← Phase 2 寫（env 切換 mock/uat/production）
└── webhook.ts           ← Phase 2 寫（永豐通知處理）

tests/lib/payment-providers/sinopac/
└── crypto.test.ts       ← 15 個 unit test、全綠
```
