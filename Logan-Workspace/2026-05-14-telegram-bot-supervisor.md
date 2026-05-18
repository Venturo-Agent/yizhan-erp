---
date: 2026-05-14
author: Logan + William（Telegram 拍板）
status: code 完成、等 William 回電腦套新版（19:32 拍板）
priority: 中（William 長期在外辦公需要、但非 blocker）
related: 2026-05-14-API整合UX-教學與額度.md
---

> **2026-05-14 19:32 update（Telegram 拍板）**
>
> 早上版本 bug：supervisor 寫死 `--resume`、`/handoff` 看似 reset 但 context 沒清、對話跟舊的一樣。
>
> 修法（已 patch 完）：reset flag 開關機制
> - `~/.local/bin/claude-bot-supervisor.sh`：加 `RESET_FLAG="/tmp/claude-bot-$BOT-reset"` 偵測。有 flag → `RESUME_ARG=""`（開新 session）、沒 flag → `RESUME_ARG="--resume"`（接續、避免 supervisor 自重啟 / claude crash 時失憶）
> - `~/.claude/plugins/cache/claude-plugins-official/telegram/0.0.6/server.ts:990-996`：magic word handler 內、SIGTERM 之前、`writeFileSync` 寫 flag
>
> 流程：
> 1. William 在 telegram 打 /new (or /handoff / /reset / /restart)
> 2. plugin 寫 flag + 30 秒後 SIGTERM claude
> 3. supervisor wait 收到 → sleep 3 → spawn 新 claude（看到 flag、不 --resume、context 真清）
> 4. 新 session 上線、William 在 telegram 繼續聊
>
> ⚠️ 教訓（觸犯鐵律 #2、19:10 已道歉）：
> Logan 想從遠端 session nohup detach 重啟 alex/max/robin 套新版、沒驗證 TTY 需求就動手、結果 claude 在無 TTY 環境 fallback `--print` 模式、跟 `--resume` 衝突起來就掛。bot 必須在 William 電腦 terminal 用 alias 啟動、不能遠端 nohup。
>
> 啟用步驟（William 回電腦做）：
> 1. terminal 跑 `ccta` / `cctm` / `cctr`（alex/max/robin 套新版上線、19:09 被 kill 掉了）
> 2. 順便 `cctl` / `ccty` / `cctk` / `cctn`（logan/yusuke/kuroha/nova 也套新版）
> 3. telegram 打 `/new` 給任一隻 bot 驗證 — 30 秒後它對話應該真的失憶（不再記得舊脈絡）
>
> handoff 卡 + on-session-start hook 還沒做（spec 提的但沒實作）。新 session 不會主動讀舊卡 + 跟 William 打招呼、目前先不做、reset 名實相符就夠用。

---

# Telegram Bot Supervisor + Magic Word Reset

## TL;DR

讓 William 透過 Telegram 打「/handoff」或「/new」magic word、自動：
1. 當前 Claude session 寫 handoff 卡（不丟失對話進度）
2. Force kill 當前 session
3. Supervisor 自動 spawn 新 claude session（with --resume 讀 handoff 卡）
4. Telegram 收到「新 session 已開、請繼續」回覆

業務目的：William 不在電腦前、長期遠端用 Telegram 也能控制 session 生命週期、不會因 context 過長失憶。

---

## 為什麼要做

William 拍板（telegram message 1087、2026-05-14）：

「我現在準備去公司的路上、長期在外要跟 Claude 溝通、但沒辦法按 /new 或 /compact、context 會無限增長最後爆炸。」

現狀：
- Claude Code 內建 auto-compact、context 滿會自動壓縮（不會炸）
- 但 auto-compact 後 Claude 會「忘記細節」、跟 William 對話可能要重複問
- William 想要主動 reset session 的能力、不靠回到電腦

---

## 架構

```
[William 在 Telegram 打 /handoff]
       ↓
[Bot plugin 偵測 magic word]
       ↓
[Bot 寫 handoff cue file 到 /tmp/claude-handoff-<bot>.json]
       ↓
[Bot 對 Claude 注入訊息「請整理 handoff 卡到 vault、然後 exit」]
       ↓
[Claude 寫 handoff 卡（vault 內固定位置）、call exit hook]
       ↓
[Claude process exits with code 0]
       ↓
[Supervisor script 偵測 child exit、sleep 3、spawn 新 claude with --resume]
       ↓
[新 claude session boot 時讀 handoff 卡、跟 William 打招呼「已 reset、繼續」]
```

---

## 實作步驟

### 1. Supervisor Script

位置：`~/.local/bin/claude-bot-supervisor.sh`

```bash
#!/bin/bash
# Usage: claude-bot-supervisor.sh <bot-name> <cwd> [system-prompt-files...]
#
# Run claude in a loop. Each time claude exits, sleep 3 and spawn a new session.
# Used by ccta / cctm / cctr / cctl / ccty / cctk aliases for long-running bots.

set -e

BOT="$1"
CWD="$2"
shift 2
PROMPT_FILES="$@"

STATE_DIR="$HOME/.claude/channels/telegram-$BOT"
LOG_FILE="$HOME/.claude/channels/telegram-$BOT/supervisor.log"

echo "[$(date)] [supervisor:$BOT] starting in $CWD" | tee -a "$LOG_FILE"

while true; do
  echo "[$(date)] [supervisor:$BOT] spawn claude session" | tee -a "$LOG_FILE"

  cd "$CWD" || exit 1

  if [ -n "$PROMPT_FILES" ]; then
    TELEGRAM_STATE_DIR="$STATE_DIR" \
      claude \
        --append-system-prompt "$(cat $PROMPT_FILES)" \
        --resume \
        --channels plugin:telegram@claude-plugins-official \
        --dangerously-skip-permissions
  else
    TELEGRAM_STATE_DIR="$STATE_DIR" \
      claude \
        --resume \
        --channels plugin:telegram@claude-plugins-official \
        --dangerously-skip-permissions
  fi

  EXIT_CODE=$?
  echo "[$(date)] [supervisor:$BOT] claude exited ($EXIT_CODE)、3 秒後重啟" | tee -a "$LOG_FILE"
  sleep 3
done
```

### 2. Telegram Plugin Magic Word Patch

位置：`~/.claude/plugins/cache/claude-plugins-official/telegram/0.0.6/server.ts`

修法：在 inbound message handler 內、檢查 message body 開頭：

```ts
const MAGIC_WORDS = ['/handoff', '/new', '/reset', '/restart']

function isMagicWord(text: string): boolean {
  const trimmed = text.trim().toLowerCase()
  return MAGIC_WORDS.some(w => trimmed === w || trimmed.startsWith(w + ' '))
}

// In inbound message handler:
if (isMagicWord(msg.text)) {
  // 1. 寫 handoff cue file
  const cueFile = `/tmp/claude-handoff-${botName}.json`
  fs.writeFileSync(cueFile, JSON.stringify({
    requested_at: new Date().toISOString(),
    requester: msg.from.username,
    reason: msg.text,
  }))

  // 2. 回 Telegram
  await sendReply(msg.chat_id, '收到 handoff 請求、正在整理⋯ session 重啟後我會打招呼。')

  // 3. 對 Claude 注入訊息（讓 Claude 整理 handoff 卡然後自我 exit）
  //    具體做法：讓 plugin 走 normal channel 把訊息送進 Claude
  //    Claude 端會看到 system 訊息：「請整理進度成 handoff 卡到 vault、然後 /exit」

  // 4. 5 秒後 force kill claude（如果它自己沒乖乖 exit）
  setTimeout(() => {
    // claude is the parent process of plugin
    process.kill(process.ppid, 'SIGTERM')
  }, 30_000)

  return // 不繼續正常 message flow
}
```

⚠️ 上面 setTimeout + ppid kill 是 sketch、實際實作要 spike test。可能要：
- 用 IPC 跟 claude 通訊
- 或寫 file flag + claude hook 偵測
- 或 plugin 直接 exit (?)
- 試出哪種能讓 supervisor 偵測到 claude exit

### 3. zshrc Alias 改成走 Supervisor

```bash
# 取代原本的 ccta():
ccta() {
  export TELEGRAM_BOT_TOKEN="..."
  claude-bot-supervisor.sh alex \
    ~/Projects/yizhan-erp \
    ~/.claude/personas/servants-common.md ~/.claude/personas/alex.md
}
```

### 4. Handoff 卡格式

位置：`~/Obsidian/Logan-Workspace/handoff/<bot>/<timestamp>.md`

內容範本：
```markdown
---
bot: alex
session_id: <uuid>
ended_at: 2026-05-14T22:44:00+08:00
requested_by: william_chien_1230
trigger: /handoff
---

# Handoff: alex session

## 對話脈絡
（最近 5-10 條訊息摘要）

## 還沒做完的事
- [ ] task 1
- [ ] task 2

## 給新 session 的指引
新 session boot 時讀此卡、跟 William 打招呼「我接手了、上一個 session 做完 X / 還沒做 Y、繼續嗎？」
```

### 5. 新 Session Boot 時讀 Handoff

新 session 用 `--resume` 已自動接續對話。但要在新 session boot 時 trigger 「打招呼」、可以：
- Claude hook on-session-start
- 或在 system prompt 內加「啟動時檢查 /tmp/claude-handoff-<bot>.json、有的話 ack」

---

## 測試方法

E2E：
1. 在電腦上 source zshrc + 跑 supervisor 版 ccta
2. iPhone Telegram 跟 alex bot 聊一陣子
3. 打「/handoff」
4. 預期：
   - Telegram 收到「收到 handoff 請求、正在整理⋯」
   - 30 秒內收到「新 session 已開、繼續嗎？」
5. 確認 vault 內有新 handoff 卡

Edge cases：
- Claude 卡住沒乖乖 exit → 30 秒 force kill 觸發
- Supervisor crash → systemd / launchd auto-restart（之後做）
- Magic word 在中文對話中誤觸發 → 嚴格 match 開頭 + 全字 match

---

## 範圍 + 工程量

|範圍|工程量|
|---|---|
|Supervisor script|30 min|
|Telegram plugin patch（magic word + exit）|1-1.5 hr（要 spike）|
|zshrc 改造|20 min|
|Handoff 卡 format + hook on-session-start|30 min|
|E2E 測試|30 min|
|**Total**|**3-4 hr**|

⚠️ 注意：
- Telegram plugin 是 cache 內、改了 plugin update 會被覆蓋。考慮 fork 自己 maintain 或 PR 給 upstream
- supervisor 跑著沒用 systemd / launchd 監控、terminal 關閉就斷。長遠該用 launchd 把它變 daemon

---

## 紀錄

- 2026-05-14 22:44 William telegram 拍板「方案 1」（supervisor + magic word + auto restart）
- 起源：問「不在電腦前怎麼 /new」→ Logan 列 3 方案 → William 選方案 1
- Owner: Logan
- 時程: 上線前做（讓 William 試用客戶 onboarding 時能遠端控制 session）
