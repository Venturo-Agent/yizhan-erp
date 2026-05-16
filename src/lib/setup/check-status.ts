/**
 * Setup Status Checker
 *
 * 2026-05-15 William 拍板：客戶簽約 → 完成 setup 才能完整作業。
 * 此檔演算 workspace 是否完成 setup、回傳 todos 給 UI 顯示。
 *
 * Banner 版（此 phase）：不擋 feature、純提示 + 跳對應設定頁。
 * 強制版（之後）：強制 redirect /setup/onboarding wizard。
 */

export interface SetupTodo {
  key: string
  label: string
  done: boolean
  /** 跳轉目標 URL（讓 user 點「立即設定」直接到對應頁） */
  action_url: string
  /** 詳細說明（hover tooltip / banner 展開時用） */
  hint?: string
}

export interface SetupStatus {
  completed: boolean
  completed_at: string | null
  banner_dismissed_at: string | null
  total: number
  done_count: number
  todos: SetupTodo[]
}

interface CheckInput {
  workspace: {
    id: string
    name: string | null
    tax_id: string | null
    transfer_fee_mode: string | null
    leave_policy: string | null
    pension_system: string | null
    default_billing_day_of_week: number | null
    setup_completed_at: string | null
    setup_banner_dismissed_at: string | null
  }
  bank_accounts_count: number
  payment_methods_count: number
  employees_count: number
}

export function computeSetupStatus(input: CheckInput): SetupStatus {
  const { workspace, bank_accounts_count, payment_methods_count, employees_count } = input
  const wsId = workspace.id

  const todos: SetupTodo[] = [
    {
      key: 'company_basic',
      label: '公司基本資料（名稱 + 統編）',
      done: !!(workspace.name && workspace.tax_id),
      action_url: '/settings/company',
      hint: '公司名稱與統一編號需填、會顯示在請款 / 收款單上',
    },
    {
      key: 'bank_accounts',
      label: '至少 1 個出帳銀行帳戶',
      done: bank_accounts_count > 0,
      action_url: '/finance/settings',
      hint: '出納單會從這些帳戶選擇出帳、需有「可作為出帳帳戶」勾選的帳戶',
    },
    {
      key: 'transfer_fee_mode',
      label: '結帳分攤模式（平均分攤 / 每筆收取）',
      done: !!workspace.transfer_fee_mode,
      action_url: '/settings/company',
      hint: '決定出納單手續費怎麼算',
    },
    {
      key: 'billing_day',
      label: '預設出帳日（每週幾）',
      done: workspace.default_billing_day_of_week !== null,
      action_url: '/settings/company',
      hint: '請款單剔除後的下次出帳日依此計算',
    },
    {
      key: 'payment_methods',
      label: '至少 1 個付款方式（匯款 / 信用卡 ...）',
      done: payment_methods_count > 0,
      action_url: '/finance/settings',
      hint: '出納單跟請款單需要選付款方式',
    },
    {
      key: 'hr_policy',
      label: 'HR 政策（特休制度 + 資遣費制度）',
      done: !!(workspace.leave_policy && workspace.pension_system),
      action_url: `/workspaces/${wsId}`,
      hint: '特休 / 資遣費試算依此政策',
    },
    {
      key: 'employees',
      label: '至少 1 位員工',
      done: employees_count > 0,
      action_url: '/hr',
      hint: '員工是後續所有作業的對象',
    },
  ]

  const done_count = todos.filter(t => t.done).length
  const completed = done_count === todos.length

  return {
    completed,
    completed_at: workspace.setup_completed_at,
    banner_dismissed_at: workspace.setup_banner_dismissed_at,
    total: todos.length,
    done_count,
    todos,
  }
}
