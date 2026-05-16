// 列印相關 UI 標籤

export const TOUR_PRINT_DIALOG_LABELS = {
  列印: '列印',
  成員名單: '成員名單',
  航班確認: '航班確認',
  住宿確認: '住宿確認',
  選擇要匯出的欄位: '選擇要匯出的欄位',
  取消全選: '取消全選',
  全選: '全選',
  Excel: 'Excel',
  載入航班資料中: '載入航班資料中...',
  已載入_筆_PNR_資料: (count: number) => `已載入 ${count} 筆 PNR 資料`,
  人已選: (selected: number, total: number) => `${selected} / ${total} 人已選`,
  選擇要列印航班確認單的成員_每人一頁: '選擇要列印航班確認單的成員（每人一頁）',
  選擇要列印住宿確認單的成員_每人一頁: '選擇要列印住宿確認單的成員（每人一頁）',
  列印_人: (count: number) => `列印 (${count} 人)`,
  成員名單_團號: (code: string) => `成員名單 - ${code}`,
  出發日期: (date: string) => `出發日期：${date}`,
  總人數: (count: number) => `總人數：${count} 人`,
  COMPANY_NAME_股份有限公司: '', // 動態從 workspace 讀取
  電子機票號碼_E_TICKET_NUMBER: '電子機票號碼 E-TICKET NUMBER',
  電腦代號_PNR: '電腦代號 PNR',
  旅客姓名_PASSENGER_NAME: '旅客姓名 PASSENGER NAME',
  出發_DEPART: '出發 DEPART',
  抵達_ARRIVE: '抵達 ARRIVE',
  電子機票: (code: string) => `電子機票 - ${code}`,
  第_航廈: (terminal: string) => `第${terminal}航廈`,
  經濟艙_Economy: '經濟艙 Economy',
  此文件資訊僅供參考_實際資訊以航空公司及相關旅遊供應商為準:
    '**** 此文件資訊僅供參考，實際資訊以航空公司及相關旅遊供應商為準 ****',
  住宿確認單: '住宿確認單',
  台北市大同區重慶北路一段67號八樓之二: '台北市大同區重慶北路一段67號八樓之二',
  團號: (code: string) => `團號: ${code}`,
  行程: (name: string) => `行程: ${name}`,
  旅客姓名: '旅客姓名:',
  飯店名稱: '飯店名稱',
  入住日期: '入住日期',
  退房日期: '退房日期',
  此確認單僅供參考_實際訂房資訊以飯店確認為準:
    '**** 此確認單僅供參考，實際訂房資訊以飯店確認為準 ****',
  取消: '取消',
  票號_冒號: '票號:',
  div_class_no_flight_尚無航班資訊_div: '<div class="no-flight">尚無航班資訊</div>',
  tr_td_colspan_3_style_padding_20px_text_align_center_color_999_尚未設定住宿資訊_td_tr:
    '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #999;">尚未設定住宿資訊</td></tr>',
}

export const PRINT_TOUR_CLOSING_LABELS = {
  結帳明細報表: '結帳明細報表',
  團名: '團名：',
  製表人: '製表人：',
  列印日期: '列印日期：',
  無收入紀錄: '無收入紀錄',
  無支出紀錄: '無支出紀錄',
  無獎金明細: '無獎金明細',
} as const

export const CLOSING_REPORT_DIALOG_LABELS = {
  結案報告預覽: '結案報告預覽',
  載入中: '載入中…',
  取消: '取消',
  列印: '列印',
  列印並結團: '列印並結團',
} as const
