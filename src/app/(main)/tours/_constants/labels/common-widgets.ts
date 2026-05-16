// comp-tours 結構化 widget 標籤（行程同步、分房/車/桌、財務結算、收款、設計）
// 由 common.ts 合併進 COMP_TOURS_LABELS，不直接對外 export

export const COMP_TOURS_WIDGETS = {
  // 行程表天數同步 dialog
  LABEL_5905: '行程表天數需要同步',
  LABEL_9765: '旅遊團日期已變更，關聯的行程表天數不一致',
  LABEL_4788: '行程表名稱',
  LABEL_6069: '目前天數',
  LABEL_357: '新的天數',
  LABEL_493: '變更',
  LABEL_7016: '天：',
  LABEL_5498: '天空白行程。',
  ADD_1897: '新增的天數會使用預設模板，您可以稍後在行程表編輯器中修改內容。',
  LABEL_1982: '維持原樣',
  UNIT_DAY: '天',
  INCREASE_PREFIX: '增加',
  DECREASE_PREFIX: '減少',
  SELECT_DAYS_TO_REMOVE: '請選擇要移除的',
  SELECT_EXACT_DAYS: (required: number, selected: number) =>
    `請選擇剛好 ${required} 天（目前已選 ${selected} 天）`,
  APPEND_BLANK_DAYS: '將在行程表末尾新增',

  // 分配管理（分房 / 分車 / 分桌）
  MANAGE_972: '分配管理',
  LABEL_9712: '分房',
  LABEL_3590: '分車',
  LABEL_2548: '分桌',
  LABEL_5972: '提示：團員分配請在成員名單中使用下拉選單操作',

  ADD_9831: '新增房間',
  SETTINGS_4277: '尚未設定房間',
  ADD_2808: '點擊「新增房間」開始設定',
  LABEL_9: '房型',
  LABEL_7871: '容納人數',
  LABEL_5734: '飯店名稱（選填）',
  ADD: '新增',

  LABEL_869: '從行程帶入餐食',
  SETTINGS_7076: '尚未設定餐食',
  SETTINGS_4545: '請先在行程表設定餐食資訊',
  ADD_4886: '新增桌次',
  LABEL_7499: '每桌人數',
  LABEL_3162: '自訂：',
  LABEL_2543: '人',

  ADD_5339: '新增車輛',
  SETTINGS_4888: '尚未設定車輛',
  ADD_7430: '點擊「新增車輛」開始設定',
  LABEL_1938: '車輛名稱 *',
  LABEL_8181: '車型',
  LABEL_7438: '座位數',
  LABEL_6947: '司機姓名',
  LABEL_8290: '司機電話',
  LABEL_6418: '車牌號碼',

  LABEL_9684: '開代轉',

  // 財務結算
  LABEL_939: '團體結算 -',
  CALCULATING_8065: '計算中...',
  LABEL_4089: '團費收入',
  LABEL_1907: '成本支出',
  LABEL_6713: '毛利',
  LABEL_8090: '公司雜支 (',
  LABEL_1032: '稅金 (12%)',
  ADD_6980: '新增業務',
  ADD_1122: '新增 OP',

  // 住宿/餐食表
  LOADING_6912: '載入中...',
  LABEL_1695: '此團尚未關聯報價單',
  LABEL_8833: '請先建立或關聯報價單',
  EMPTY_7809: '報價單尚無住宿/餐食資料',
  LABEL_9677: '請先在報價單填寫住宿和餐食項目',
  LABEL_460: '住宿表',
  LABEL_5591: '說明',
  LABEL_9767: '餐食表',
  HOTEL_COUNT: (n: number) => `(${n} 間飯店)`,
  RESTAURANT_COUNT: (n: number) => `(${n} 間餐廳)`,
  NIGHT_COUNT: (n: number) => `(${n} 晚)`,
  MEAL_COUNT: (n: number) => `(${n} 餐)`,
  PAYABLE_COUNT: (n: number) => `(${n} 項可請款)`,
  CONFIRMED_COST: (amount: string) => `確認成本：NT$ ${amount}`,
  ESTIMATED_COST: (amount: string) => `預估成本：NT$ ${amount}`,

  // 網頁設計
  EMPTY_3090: '尚無設計',
  LABEL_5671: '可從行程表建立網頁行程設計',
  LABEL_6192: '選定版本',
  LABEL_1670: '開啟',

  // 旅遊團基本資料編輯
  EDIT_7182: '編輯旅遊團基本資料',

  LABEL_9750: '團號',
  LABEL_5475: '目的地',
  LABEL_4601: '報價單',
  EDIT: '編輯',
  LABEL_3513: '明細',

  // 收款紀錄
  ADD_3548: '新增收款',
  LABEL_8600: '收款紀錄',
  TYPE: '類型',
  AMOUNT: '金額',
  LABEL_7778: '付款方式',
  STATUS: '狀態',
  ACTIONS: '操作',
  EMPTY_3087: '尚無收款紀錄',
  ADD_6738: '點擊上方「新增收款」按鈕開始記錄收款',

  LABEL_1448: '尚未建立報價單',
  CALCULATING_1295: '建立報價單以計算團費成本',

  MANAGE_1448: '房間管理',
  LABEL_9154: '提示：團員分房請在成員名單中使用下拉選單操作',

  MANAGE_7961: '車輛管理',
  LABEL_6906: '提示：團員分車請在成員名單中使用下拉選單操作',

  LABEL_4270: '尚未建立行程表',
  LABEL_4124: '建立行程表以展示旅遊行程內容',

  // 分車/分房/分桌 動態文字
  VEHICLE_COUNT: (n: number) => `${n} 輛車`,
  VEHICLE_SUMMARY: (vehicles: number, capacity: number, assigned: number) =>
    `共 ${vehicles} 輛車，總容量 ${capacity} 人，已分配 ${assigned} 人`,
  CAPACITY_DISPLAY: (assigned: number, capacity: number) => `${assigned}/${capacity} 人`,
  TOUR_DURATION: (days: number, nights: number) => `${days} 天 ${nights} 夜`,
  NIGHT_ROOMS: (night: number, rooms: number) => `第${night}晚 (${rooms}房)`,
  ROOM_SUMMARY: (rooms: number, capacity: number, assigned: number) =>
    `共 ${rooms} 間房，容量 ${capacity} 人，已分配 ${assigned} 人`,
  ADD_ROOM_NIGHT: (night: number) => `新增房間（第${night}晚）`,
  MOVE_ITEM: (source: string, target: string) => `移動 ${source} 到 ${target}`,
  TABLE_ADDED: (tableNumber: number, capacity: number) =>
    `已新增 ${tableNumber} 桌 (${capacity}人)`,
  TABLE_ENABLED_SUMMARY: (enabled: number, total: number) =>
    `已啟用 ${enabled} 餐分桌，共 ${total} 桌`,
  IMPORT_MEALS: (count: number) => `從行程帶入 ${count} 筆餐食`,
  DAY_NUMBER: (day: number | string) => `第 ${day} 天`,
  TABLE_STATS: (tables: number, assigned: number, capacity: number) =>
    `${tables} 桌 / ${assigned}/${capacity} 人`,
  TABLE_NUMBER: (n: number) => `${n} 桌`,
  CAPACITY_SHORT: (n: number) => `${n}人`,
  VEHICLE_COUNT_SHORT: (n: number) => `共 ${n} 輛車`,

  // Itinerary actions
  INSERT_ARROW: '插入箭頭',
  INSERT_PLANE: '插入飛機',
  NOTE: '備註',
} as const
