/**
 * 漫途 CIS 工作流 — UI labels
 *
 * 中央化規範：所有對外文案放這、不要散在 component 裡。
 *
 * TODO: can be removed — all string-literal consumers migrated to useTranslations('cis')
 * NOTE: Function-type values (confirm_delete in CIS_PAGE_LABELS and CIS_PRICING_LABELS,
 *       CIS_GUIDANCE_QUESTIONS array) remain here as they cannot be represented in JSON.
 */

export const CIS_PAGE_LABELS = {
  page_title: '漫途 CIS 工作流',
  subtitle: '客戶識別系統規劃 — 客戶 + 拜訪紀錄 + 五階段品牌資料卡',
  btn_add_client: '新增客戶',
  search_placeholder: '搜尋公司名 / 聯絡人 / 電話',
  empty_state: '還沒有客戶。先新增第一家旅行社、開始 CIS 規劃流程。',

  col_code: '編號',
  col_company: '公司名稱',
  col_contact: '聯絡人',
  col_phone: '電話',
  col_status: '狀態',
  col_travel_types: '旅遊類型',
  col_visits: '拜訪次數',
  col_updated: '更新時間',

  status_lead: '線索',
  status_active: '進行中',
  status_closed: '結案',

  title_view: '查看客戶',
  title_edit: '編輯客戶',
  title_brand_card: '品牌資料卡（多次拜訪累積）',
  customer_load_failed: '客戶資料載入失敗',
  title_delete: '刪除客戶',
  confirm_delete: (name: string) =>
    `確定要刪除客戶「${name}」嗎？\n（含所有拜訪紀錄、無法復原）`,
  confirm_delete_title: '刪除客戶',
  btn_cancel: '取消',
  btn_save: '儲存',
  btn_saving: '儲存中…',
  btn_delete: '確定刪除',
  toast_delete_success: '已刪除客戶',
  toast_delete_failed_prefix: '刪除失敗：',
}

export const CIS_CLIENT_FORM_LABELS = {
  add_title: '新增 CIS 客戶',
  edit_title: '編輯 CIS 客戶',
  section_basic: '基本資料',
  section_brand: '品牌標籤（可選、之後拜訪時補）',
  label_company_name: '公司名稱',
  label_contact_name: '聯絡人',
  label_phone: '電話',
  label_email: 'Email',
  label_address: '地址',
  label_status: '狀態',
  label_travel_types: '旅遊類型',
  label_tags: '其他標籤（逗號分隔）',
  label_notes: '備註',
  placeholder_company_name: '例：山岳旅行社',
  placeholder_contact_name: '例：王小姐',
  placeholder_phone: '例：02-2345-6789 或 0912-345-678',
  placeholder_email: 'example@traveler.tw',
  placeholder_address: '台北市信義區⋯',
  placeholder_tags: '譬如：台北、老牌、社群活躍',
  placeholder_notes: '初步觀察、轉介來源等',
  toast_create_success: '已新增客戶',
  toast_update_success: '已更新客戶資料',
  toast_create_failed: '新增客戶失敗',
  toast_update_failed: '更新客戶失敗',
}

export const CIS_VISIT_LABELS = {
  page_section_title: '拜訪紀錄',
  btn_add_visit: '新增拜訪',
  empty_state: '還沒有拜訪紀錄。新增第一次拜訪、開始引導對話。',

  add_title: '新增拜訪紀錄',
  edit_title: '編輯拜訪紀錄',
  section_meta: '拜訪資訊',
  section_guidance: '五階段引導對話',
  section_brand_card: '品牌資料卡（這次蒐集到的）',
  section_summary: '拜訪總結',

  label_visited_at: '拜訪日期',
  label_stage: '所在階段',
  label_summary: '拜訪總結（自由筆記）',

  label_brand_keywords: '品牌關鍵詞',
  label_emotional_keywords: '情感關鍵詞',
  label_value_proposition: '價值主張（一句話對客人說的）',
  label_touchpoints: '主要觸點',
  label_differentiation: '競爭差異',
  label_must_do: '必做項目',
  label_suggested: '建議項目',
  label_optional: '可選項目',
  label_color_tone: '色調暗示',
  label_visual_style: '風格暗示',

  placeholder_summary: '今天聊的重點 / 客戶情緒 / 後續注意事項⋯',
  placeholder_keywords: '逗號分隔，例：溫暖, 安心, 家庭感',
  placeholder_value_proposition: '例：讓爸媽放心、孩子開心',
  placeholder_touchpoints: '逗號分隔，例：官網, 報價單, 行程手冊',
  placeholder_differentiation: '例：領隊都受過親子互動訓練、客人記得是「會帶小孩的領隊」',
  placeholder_color_tone: '例：暖色系 / 大地色',
  placeholder_visual_style: '例：親切手繪、自然清新',
  placeholder_items: '逗號分隔項目',

  toast_create_success: '已新增拜訪紀錄',
  toast_update_success: '已更新拜訪紀錄',
  toast_save_failed: '儲存拜訪紀錄失敗',

  confirm_delete: '確定要刪除這筆拜訪紀錄嗎？',
  confirm_delete_title: '刪除拜訪紀錄',
  edit: '編輯',
  delete: '刪除',
}

export const CIS_AUDIO_LABELS = {
  btn_upload: '上傳錄音',
  btn_uploading: '上傳中…',
  btn_remove: '移除錄音',
  btn_transcribe: '✨ 自動轉錄成總結',
  toast_upload_success: '錄音已上傳',
  toast_upload_failed: '上傳失敗',
  toast_transcribe_pending: '🚧 自動轉錄功能開發中（會接 Whisper API）— 目前請手動填寫總結',
  invalid_type: '只支援音訊檔（mp3 / m4a / wav / webm / ogg）',
}

export const CIS_AI_LABELS = {
  btn_analyze: '✨ AI 分析填表',
  btn_analyzing: '分析中…',
  toast_no_summary: '請先填寫拜訪總結再用 AI 分析',
  toast_filled: '已用 AI 自動填入品牌資料卡欄位',
  toast_failed: 'AI 分析失敗',
  toast_heuristic_mode: '🧪 目前使用啟發式分析（Claude API 接好後會自動切換）',
}

export const CIS_PRICING_LABELS = {
  page_title: '衍生項目價目表',
  search_placeholder: '搜尋項目名 / 編號',
  btn_add: '新增項目',
  empty_state: '還沒有價目項目。價目表用來把拜訪收集到的需求自動算出報價草案。',

  col_code: '編號',
  col_category: '類別',
  col_name: '項目',
  col_unit: '單位',
  col_price: '價格區間',
  col_keywords: 'Match 關鍵詞',
  col_active: '啟用',

  add_title: '新增衍生項目',
  edit_title: '編輯衍生項目',
  label_code: '編號（譬如 IDN-001、留空自動產生）',
  label_category: '類別',
  label_name: '項目名稱',
  label_description: '說明',
  label_unit: '單位',
  label_price_low: '價格下限',
  label_price_high: '價格上限',
  label_match_keywords: 'Match 關鍵詞（逗號分隔，從拜訪需求自動 match）',
  label_sort: '排序',
  label_is_active: '是否啟用',
  label_notes: '內部備註',
  placeholder_keywords: '譬如：logo, 識別, 標誌, 品牌',
  placeholder_code: 'IDN-001',
  placeholder_unit: '式 / 套 / 批',
  placeholder_name: '例：Logo 優化',
  placeholder_description: '這個項目的內容說明',
  placeholder_price_low: '15000',
  placeholder_price_high: '35000',

  toast_create_success: '已新增項目',
  toast_update_success: '已更新項目',
  edit: '編輯',
  delete: '刪除',
  confirm_delete: (name: string) => `確定要刪除「${name}」嗎？`,
}

export const CIS_QUOTE_LABELS = {
  btn_generate: '💰 產出報價草案',
  dialog_title: '報價草案',
  subtitle: '根據此客戶累積的品牌資料卡 + 衍生項目價目表自動算出',

  empty_no_pricing:
    '還沒有衍生項目價目表。先去「衍生項目價目」設定一份、之後拜訪收集到的需求才能自動算報價。',
  empty_no_needs:
    '此客戶還沒蒐集到任何「優先需求」。先在拜訪紀錄裡填「必做 / 建議 / 可選」項目、報價草案才能自動產出。',

  section_must_do: '必做（轉成正式報價）',
  section_suggested: '建議（可選擇加入）',
  section_optional: '可選（後續方案）',
  section_unmatched: '未對應到價目表的需求',

  total_label: '預估報價區間',
  unmatched_hint: '這些需求在價目表中沒有 Match、可以自己新增項目或修改 Match 關鍵詞',

  btn_close: '關閉',
  btn_setup_pricing: '前往設定價目表',

  status_dev: '🚧 「轉成正式報價單」按鈕開發中、會跟 ERP 既有報價單系統對接',
}

export const CIS_GUIDANCE_QUESTIONS: { stage: string; questions: string[] }[] = [
  {
    stage: '① 破冰與確認',
    questions: [
      '可以先簡單介紹一下，貴公司主要做什麼樣的旅遊行程嗎？國內 / 國外、親子 / 商務 / 銀髮？',
    ],
  },
  {
    stage: '② 品牌現況探勘',
    questions: [
      '貴公司目前有 Logo 或識別系統嗎？方便分享嗎？',
      '客人最常從哪些管道認識你們？搜尋？推薦？社群？',
      '如果遮住 Logo，客人能從哪裡認出是你家？服務態度？行程特色？',
    ],
  },
  {
    stage: '③ 情感與體驗定位（核心）',
    questions: [
      '客人從搜尋到回國，哪三個瞬間最容易記住你們？',
      '如果可以對第一次來的客人說一句話，會是什麼？',
      '行程跟其他家有什麼不同？為什麼客人選你們？',
      '希望客人想到貴公司時，腦中浮現什麼畫面或感覺？',
    ],
  },
  {
    stage: '④ 接觸點與應用需求',
    questions: [
      '客人每天接觸最多的三個地方是哪裡？網站？報價單？社群？行程手冊？',
      '目前哪裡讓您覺得「不夠專業」或「想改變」？',
      '如果只能先改善一樣，您會選什麼？',
    ],
  },
  {
    stage: '⑤ 介紹服務與結語',
    questions: [
      '根據前面聊到的，CIS 規劃可以包含哪些項目？',
      '建議優先順序：先做模板套版？還是 Logo？還是行李吊牌？',
    ],
  },
]
