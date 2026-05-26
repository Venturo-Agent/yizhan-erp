/**
 * member-write-tracker - 追蹤「本地剛寫入」的成員
 *
 * 為什麼存在（2026-05-26）：
 * order_members 5/20 後被加進 realtime publication。內聯編輯每打一字就寫 DB、
 * 廣播又把同樣的值「回音」回來、用 setMembers 蓋回正在編輯的輸入框 →
 * 中文快打組字被打斷、重複字（「張張文」）。
 *
 * 解法：寫入時標記該成員「剛由本地寫過」、realtime 收到該成員的 UPDATE 回音時、
 * 在時間窗內就略過、不蓋本地（本地已樂觀更新、值是對的）。
 * 等於「自己的回音不要拿來蓋自己正在打的格子」。
 *
 * 代價：極少數情況、別人在你寫入後 WINDOW_MS 內改了同一個成員的別的欄位、
 * 你要等下次載入才看到（機率極低、可接受）。
 */

const recentWrites = new Map<string, number>()

// 時間窗：連續打字時每次寫入都會刷新、所以實際是「停手後 WINDOW_MS 內的回音都擋」
const WINDOW_MS = 3000

/** 標記某成員剛由本地寫入（寫 DB 前後呼叫皆可） */
export function markMemberLocalWrite(memberId: string): void {
  recentWrites.set(memberId, Date.now())
}

/** 該成員是否在時間窗內被本地寫過（realtime 回音用來判斷要不要略過） */
export function wasMemberRecentlyWritten(memberId: string): boolean {
  const ts = recentWrites.get(memberId)
  if (ts === undefined) return false
  if (Date.now() - ts > WINDOW_MS) {
    recentWrites.delete(memberId)
    return false
  }
  return true
}
