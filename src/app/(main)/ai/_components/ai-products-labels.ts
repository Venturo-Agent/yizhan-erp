/**
 * 商品分頁顯示文字（中央化、不寫死在 component、地方法律 Step 5）
 */

export const PRODUCT_LABELS = {
  tab: '商品',
  sectionTitle: '商品上架',
  sectionDesc:
    '上架商品讓 AI 客服查得到。客戶問到價格 / 內容 / 有效期時、AI 會優先用這裡的資料回答。',
  addButton: '新增商品',

  // 欄位
  name: '商品名稱',
  contents: '內容物',
  price: '價格',
  currency: '幣別',
  description: '說明',
  validFrom: '販賣開始日',
  validTo: '販賣結束日',
  validityNote: '時效備註',

  // placeholder
  namePlaceholder: '例：富士山 SIM 卡',
  contentsPlaceholder: '例：30 天吃到飽網卡、覆蓋全日本',
  pricePlaceholder: '例：880（可留空表示洽詢報價）',
  descriptionPlaceholder: '例：適合自由行、家人可共享',
  validityNotePlaceholder: '例：購買後 180 天內啟用（日期不夠彈性時用文字補充）',

  // 按鈕 / 操作
  save: '儲存',
  cancel: '取消',
  edit: '編輯',
  delete: '刪除',
  shelfOn: '上架',
  shelfOff: '下架',

  // 狀態
  active: '上架中',
  inactive: '已下架',

  // toast
  createSuccess: '商品已新增、AI 客服馬上查得到',
  updateSuccess: '商品已更新',
  deleteSuccess: '商品已刪除',
  saveFailed: '儲存失敗',
  deleteFailed: '刪除失敗',
  loadFailed: '載入失敗',

  // 驗證
  nameRequired: '商品名稱必填',
  dateRangeInvalid: '販賣結束日不能早於開始日',

  // 其他
  loading: '載入中...',
  empty: '還沒上架任何商品、點「新增商品」建立第一個。',
  deleteConfirm: (name: string) => `確定刪除「${name}」？刪除後 AI 客服就查不到這個商品了。`,

  // 幣別選項（對齊 DB CHECK constraint）
  currencies: [
    { value: 'TWD', label: '台幣 TWD' },
    { value: 'USD', label: '美金 USD' },
    { value: 'JPY', label: '日圓 JPY' },
    { value: 'EUR', label: '歐元 EUR' },
    { value: 'CNY', label: '人民幣 CNY' },
    { value: 'HKD', label: '港幣 HKD' },
  ],
} as const
