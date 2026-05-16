/**
 * 合約模組中央 labels
 * 訂單行合約按鈕 + OrderContractDialog + 公開簽署頁共用
 */

export const CONTRACT_TEMPLATE_LABELS = {
  domestic: '國內旅遊定型化契約',
  international: '國外旅遊定型化契約',
  individual_international: '國外個別旅遊定型化契約',
} as const

export const CONTRACT_STATUS_LABELS = {
  draft: '草稿',
  sent: '已發送',
  signed: '已簽署',
  cancelled: '已取消',
} as const

export const CONTRACT_LABELS = {
  CANCELLED_PREFIX: '已取消（',
  // 按鈕
  ACTION_BUTTON: '合約',
  CREATE: '建立合約',
  REGENERATE: '重新產生',
  CANCEL: '取消合約',
  COPY_LINK: '複製簽約連結',
  OPEN_SIGN_PAGE: '開啟簽署頁',
  MARK_PAPER_SIGN: '標記紙本簽署',
  PRINT: '列印合約',
  DONE: '完成',
  CLOSE: '關閉',

  // Dialog 標題
  DIALOG_TITLE: '訂單合約',
  CREATE_TITLE: '建立合約',
  PAPER_SIGN_TITLE: '標記為紙本簽署',
  SEND_TITLE: '合約已建立',

  // 狀態提示
  AUTO_DETECTED_TYPE: '自動判斷合約類型',
  DESTINATION: '目的地',
  CONTRACT_NUMBER: '合約編號',
  RECEIVED_DATE: '收到日期',
  RECEIVED_DATE_HINT: '紙本合約收到的日期',

  // 簽約人區塊
  SIGNER_TYPE: '簽約對象',
  TYPE_INDIVIDUAL: '個人',
  TYPE_COMPANY: '公司行號',
  COMPANY_NAME: '公司名稱',
  COMPANY_NAME_PLACEHOLDER: '公司名稱',
  SIGNER_NAME: '簽約人姓名',
  NAME_PLACEHOLDER: '姓名',
  PHONE: '聯絡電話',
  PHONE_PLACEHOLDER: '電話（客戶簽署時可補填）',
  ID_NUMBER: '身分證字號',
  OPTIONAL_PLACEHOLDER: '選填（客戶簽署時可補填）',
  ADDRESS: '通訊地址',

  // 集合資訊
  MEETING_LOCATION: '集合地點',
  MEETING_LOCATION_PLACEHOLDER: '例：桃園國際機場第一航廈',
  MEETING_TIME: '集合時間',

  // 費用
  DEPOSIT_AMOUNT: '訂金金額',
  DEPOSIT_PLACEHOLDER: '輸入訂金',
  FINAL_PAYMENT_AMOUNT: '尾款金額',
  FINAL_PAYMENT_PLACEHOLDER: '輸入尾款',

  // 行程資訊
  ITINERARY_INFO: '行程資訊',
  DEPARTURE: '出發',
  RETURN: '回程',
  CONTRACT_TYPE: '合約類型',
  SIGNED_MEMBERS: '簽約團員',

  // 附件
  ATTACHMENTS: '合約附件',
  ATTACH_ITINERARY: '附上行程表',
  ATTACH_QUOTE: '附上報價單',
  ATTACH_MEMBER_LIST: '附上團員名單',

  // 團員
  EMPTY_MEMBERS: '尚無團員資料',
  EMPTY_MEMBERS_HINT: '請先在訂單新增團員',
  MEMBERS_TO_INCLUDE: '簽約團員',
  MEMBERS_TO_INCLUDE_HINT: '預設全選、可勾選排除',
  PEOPLE_SUFFIX: '人',
  ETC: '等',

  // 簽署後
  SIGNED_AT: '簽於',
  EMAIL_SEND_DEV: 'Email 發送（開發中）',

  // Toast
  TOAST_CREATED: '合約已建立',
  TOAST_CREATE_FAIL: '建立合約失敗',
  TOAST_LINK_COPIED: '已複製連結',
  TOAST_CANCELLED: '合約已取消',
  TOAST_CANCEL_FAIL: '取消失敗',
  TOAST_PAPER_MARKED: '已標記為紙本簽署',
  TOAST_MARK_FAIL: '標記失敗',
  TOAST_OP_FAIL: '操作失敗',

  // Confirm
  CONFIRM_CANCEL: '確定要取消此合約嗎？取消後可重新建立。',
  CONFIRM_REGENERATE: '確定要重新產生合約嗎？舊合約將被取消，並建立新合約。',

  // 驗證
  VALIDATION_NEED_NAME: '請輸入簽約人姓名',
  VALIDATION_NEED_COMPANY: '請輸入公司名稱',
  VALIDATION_NEED_MEMBERS: '請至少選一位團員',

  // Loading
  LOADING: '處理中⋯',
  CONFIRMING: '確認標記',
} as const
