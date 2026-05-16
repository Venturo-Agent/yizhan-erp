// TODO: can be removed — all consumers migrated to useTranslations('login') in messages/zh-TW.json
/**
 * 登入頁所有顯示文字、集中於此
 * 改文字只改這個檔、page.tsx 自動跟著變
 */
export const LABELS = {
  // 標題
  TITLE: 'Venturo',
  SUBTITLE: '旅遊資源管理系統',

  // 表單欄位 placeholder
  PLACEHOLDER_CODE: '公司代號',
  PLACEHOLDER_EMAIL: 'Email',
  PLACEHOLDER_PASSWORD: '密碼',

  // 按鈕
  LOGIN_BUTTON: '登入',
  LOGIN_BUTTON_LOADING: '登入中...',

  // 欄位提示
  CODE_HINT: '公司代號請向系統主管索取',

  // 錯誤訊息
  ERROR_ENTER_CODE: '請輸入公司代號',
  ERROR_ENTER_EMAIL: '請輸入 Email',
  ERROR_INVALID_CREDENTIALS: '公司代號、Email 或密碼錯誤，請確認後再試',
  ERROR_SYSTEM: '系統錯誤，請稍後再試',
  SESSION_EXPIRED: '登入已過期，請重新登入',
}
