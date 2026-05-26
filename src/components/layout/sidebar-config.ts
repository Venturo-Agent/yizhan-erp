/**
 * Sidebar Config — 集中 sidebar 顯示細節（icon / 顯示順序 / children sub-menu）
 *
 * 2026-05-15 William 拍板：sidebar 從 ALL_MODULES 衍生主 entry、
 * 細節（icon / children）放這份獨立 config、不汙染 module SOURCE。
 *
 * 新加 module 時：
 *   1. 寫 src/modules/<code>.ts（用 defineModule）
 *   2. 在 _registry.ts 加進 ALL_MODULES
 *   3. 跑 npm run codegen:permissions
 *   4. 來這加一行 SIDEBAR_META[code] = { icon, label?, children? }
 *      不加也行、會 fallback 用 Box icon + module.name + 無 children
 *   5. 在 SIDEBAR_ORDER 決定顯示位置（不放 = 不在 sidebar）
 *
 * 規則：
 *   - hidden: true / 不在 SIDEBAR_ORDER → 不顯示在 sidebar
 *   - href 未指定 → 用 module.routes[0]
 *   - label 未指定 → 用 module.name
 *   - icon 未指定 → 用 Box（default）
 */

import {
  Home,
  CalendarDays,
  CheckSquare,
  MessagesSquare,
  Sparkles,
  MapPinned,
  Receipt,
  CircleDollarSign,
  Coins,
  Library,
  IdCard,
  UsersRound,
  Database,
  Palette,
  Megaphone,
  FolderOpen,
  // sub icons
  Wallet,
  HandCoins,
  BarChart3,
  Settings,
  FileText,
  BookOpen,
  Calendar,
  FileCheck,
  Contact,
  Palmtree,
  Building2,
  Archive,
  Network,
  Landmark,
  Globe,
  Plane,
  Shield,
  MapPin,
  Box,
  Layout,
  type LucideIcon,
} from 'lucide-react'
import { COMP_LAYOUT_LABELS } from './constants/labels'

export interface SidebarChild {
  href: string
  label: string
  icon: LucideIcon
  /**
   * 該子 menu 對應的具體 feature code（sub-feature 級）
   * 譬如 'finance.payments' / 'finance.requests'
   * 未設 = 用父 module.code（粗粒度 fallback）
   *
   * 2026-05-15 加：sidebar children 該用 sub-feature 過濾、
   * 否則「業務只勾請款」也會看到「收款 / 出納 / 報表」全部子 menu
   */
  feature?: string
}

export interface SidebarMeta {
  /** 覆寫 sidebar 主 href（未設 = 用 module.routes[0]） */
  href?: string
  /** sidebar 主 entry icon、未設 = Box default */
  icon?: LucideIcon
  /** sidebar 顯示 label（未設 = 用 module.name） */
  label?: string
  /** 子 menu（手動定義、無法從 module.routes 衍生 label/icon） */
  children?: SidebarChild[]
  /** true = 不在 sidebar 顯示（即使 exposedToHr 且有 routes） */
  hidden?: boolean
}

/**
 * Sidebar 顯示順序（按 module code）
 *
 * 不在這個 array 內的 module 不會在 sidebar 顯示。
 * 想加 module 進 sidebar → 在這 array 加 code、SIDEBAR_META 補 icon。
 */
export const SIDEBAR_ORDER: readonly string[] = [
  'dashboard',
  'calendar',
  'todos',
  // 2026-05-26 William 拍板：客戶收回「資料管理」分區底下（database > 顧客管理）、
  // 移除頂層獨立客戶入口（推翻 5/22「移到主 sidebar」決定）。顧客項目見 database.children。
  'channels',
  'ai_hub',
  'tours',
  'orders',
  'finance',
  'accounting',
  'hr', // 2026-05-22 從 13 位上移
  'documents',
  'database',
  'marketing',
  'websites',
  'workspaces',
  'shared_data_management',
  'platform_integrations',
] as const

export const SIDEBAR_META: Record<string, SidebarMeta> = {
  dashboard: { icon: Home, label: COMP_LAYOUT_LABELS.首頁 },
  calendar: { icon: CalendarDays, label: COMP_LAYOUT_LABELS.行事曆 },
  todos: { icon: CheckSquare, label: COMP_LAYOUT_LABELS.待辦事項 },
  // 2026-05-26 移除頂層 customers 獨立項目（收回 database > 顧客管理、見 database.children）
  channels: { icon: MessagesSquare, label: COMP_LAYOUT_LABELS.頻道 },
  ai_hub: { icon: Sparkles, label: 'AI Hub' },
  tours: { icon: MapPinned, label: COMP_LAYOUT_LABELS.旅遊團 },
  orders: { icon: Receipt, label: COMP_LAYOUT_LABELS.訂單 },
  finance: {
    icon: CircleDollarSign,
    label: COMP_LAYOUT_LABELS.財務系統,
    children: [
      {
        href: '/finance/payments',
        label: COMP_LAYOUT_LABELS.收款管理,
        icon: Wallet,
        feature: 'finance.payments',
      },
      {
        href: '/finance/requests',
        label: COMP_LAYOUT_LABELS.請款管理,
        icon: HandCoins,
        feature: 'finance.requests',
      },
      {
        href: '/finance/treasury/disbursement',
        label: COMP_LAYOUT_LABELS.出納管理,
        icon: Wallet,
        feature: 'finance.disbursement',
      },
      {
        href: '/finance/reports',
        label: COMP_LAYOUT_LABELS.報表管理,
        icon: BarChart3,
        feature: 'finance.reports',
      },
      { href: '/finance/settings', label: '財務設定', icon: Settings, feature: 'finance.settings' },
    ],
  },
  accounting: {
    icon: Coins,
    label: COMP_LAYOUT_LABELS.會計系統,
    children: [
      {
        href: '/accounting/vouchers',
        label: COMP_LAYOUT_LABELS.傳票管理,
        icon: FileText,
        feature: 'accounting.vouchers',
      },
      {
        href: '/accounting/accounts',
        label: COMP_LAYOUT_LABELS.科目管理,
        icon: BookOpen,
        feature: 'accounting.accounts',
      },
      {
        href: '/accounting/period-closing',
        label: COMP_LAYOUT_LABELS.期末結轉,
        icon: Calendar,
        feature: 'accounting.period-closing',
      },
      {
        href: '/accounting/checks',
        label: COMP_LAYOUT_LABELS.票據管理,
        icon: FileCheck,
        feature: 'accounting.checks',
      },
      {
        href: '/accounting/reports',
        label: COMP_LAYOUT_LABELS.會計報表,
        icon: BarChart3,
        feature: 'accounting.reports',
      },
    ],
  },
  database: {
    icon: Library,
    label: COMP_LAYOUT_LABELS.資料管理,
    href: '/library',
    children: [
      {
        href: '/library/customers',
        label: COMP_LAYOUT_LABELS.顧客管理,
        icon: Contact,
        feature: 'database.customers',
      },
      {
        href: '/library/attractions',
        label: COMP_LAYOUT_LABELS.旅遊資料庫,
        icon: Palmtree,
        feature: 'database.attractions',
      },
      {
        href: '/library/suppliers',
        label: COMP_LAYOUT_LABELS.供應商管理,
        icon: Building2,
        feature: 'database.suppliers',
      },
      {
        href: '/library/archive-management',
        label: COMP_LAYOUT_LABELS.封存管理,
        icon: Archive,
        feature: 'database.archive',
      },
    ],
  },
  hr: {
    icon: IdCard,
    label: COMP_LAYOUT_LABELS.人資管理,
    children: [
      { href: '/hr', label: COMP_LAYOUT_LABELS.員工管理, icon: IdCard, feature: 'hr.employees' },
      {
        href: '/hr/organization',
        label: COMP_LAYOUT_LABELS.組織管理,
        icon: Network,
        feature: 'hr.organization',
      },
      {
        href: '/hr/salary-settlement',
        label: '薪資結算',
        icon: Wallet,
        feature: 'hr_salary_settlement',
      },
      {
        href: '/hr/bonus-settlement',
        label: '獎金結算',
        icon: Coins,
        feature: 'hr_bonus_settlement',
      },
    ],
  },
  documents: { icon: FolderOpen, label: '文件中心' },
  marketing: {
    icon: Megaphone,
    label: '行銷管理',
    href: '/marketing/website',
    children: [
      {
        href: '/marketing/website',
        label: '官網管理',
        icon: Globe,
        feature: 'marketing.website',
      },
    ],
  },
  // 2026-05-23 客戶官網系統（addon、沒加購 sidebar 不顯示、走 website_builder feature gate）
  websites: {
    icon: Globe,
    label: '客戶官網',
    href: '/websites/design',
    children: [
      {
        href: '/websites/design',
        label: '版面設計',
        icon: Layout,
        feature: 'websites.design',
      },
      {
        href: '/websites/products',
        label: '產品上架',
        icon: Megaphone,
        feature: 'websites.products',
      },
    ],
  },
  hr_salary_settlement: { hidden: true },
  hr_bonus_settlement: { hidden: true },
  workspaces: { icon: UsersRound, label: COMP_LAYOUT_LABELS.租戶管理 },
  shared_data_management: {
    icon: Database,
    label: COMP_LAYOUT_LABELS.共用資料,
    href: '/shared-data',
    children: [
      { href: '/shared-data/banks', label: COMP_LAYOUT_LABELS.銀行代號, icon: Landmark },
      { href: '/shared-data/countries', label: COMP_LAYOUT_LABELS.國家代號, icon: Globe },
      { href: '/shared-data/airports', label: COMP_LAYOUT_LABELS.機場代號, icon: Plane },
      { href: '/shared-data/insurance-grades', label: '勞健保級距', icon: Shield },
      { href: '/shared-data/attractions', label: COMP_LAYOUT_LABELS.景點圈管理, icon: MapPin },
    ],
  },
  platform_integrations: {
    icon: Megaphone,
    label: COMP_LAYOUT_LABELS.AiToEarn,
    href: '/platform/aitoearn',
  },
}

/** Default icon、SIDEBAR_META 沒設時 fallback */
export const DEFAULT_SIDEBAR_ICON: LucideIcon = Box
