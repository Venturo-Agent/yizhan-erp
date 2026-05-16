// 計算飛行時間
export function calculateFlightDuration(
  departureTime: string, // 格式: "06:50"
  arrivalTime: string, // 格式: "09:55" (當地時間)
  timeDiff: number // 時差（小時）
): string {
  if (!departureTime || !arrivalTime) return ''

  const [depH, depM] = departureTime.split(':').map(Number)
  const [arrH, arrM] = arrivalTime.split(':').map(Number)

  const depMinutes = depH * 60 + depM
  const arrMinutes = arrH * 60 + arrM - timeDiff * 60 // 轉換為台灣時間

  let duration = arrMinutes - depMinutes
  if (duration < 0) duration += 24 * 60 // 跨日

  const hours = Math.floor(duration / 60)
  const minutes = duration % 60

  return `${hours}小時${minutes}分`
}
