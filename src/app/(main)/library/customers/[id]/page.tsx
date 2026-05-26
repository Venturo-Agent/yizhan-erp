'use client'

/**
 * 顧客詳情頁 — 4 tab 結構
 * William 2026-05-14 拍板：要做分頁、未來 CRM 擴充
 *
 * Tab 1：基本資料（show + 編輯 button）
 * Tab 2：訂單記錄（join orders.customer_id）
 * Tab 3：交易記錄（join receipts.customer_id）
 * Tab 4：帳單記錄（join invoices.customer_id）
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Edit, User, ShoppingBag, Wallet, FileText } from 'lucide-react'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { CurrencyCell, DateCell } from '@/components/table-cells'
import { Spinner } from '@/components/ui/spinner'
import { supabase } from '@/lib/supabase/client'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { logger } from '@/lib/utils/logger'
import { CustomerDialog } from '../_components/CustomerDialog'
import { updateCustomer } from '@/data'
import type { Customer } from '@/types/customer.types'

const PAGE_LABELS = {
  TITLE: '顧客詳情',
  BACK: '返回列表',
  TAB_BASIC: '基本資料',
  TAB_ORDERS: '訂單記錄',
  TAB_TRANSACTIONS: '交易記錄',
  TAB_INVOICES: '帳單記錄',
  EDIT: '編輯',
  LOADING: '載入中...',
  NOT_FOUND: '找不到此顧客',
  EMPTY_ORDERS: '無訂單紀錄',
  EMPTY_TRANSACTIONS: '無交易紀錄',
  EMPTY_INVOICES: '無帳單紀錄',
} as const

type TabValue = 'basic' | 'orders' | 'transactions' | 'invoices'

interface OrderRow {
  id: string
  order_number: string | null
  tour_code: string | null
  total_amount: number | null
  payment_status: string | null
  created_at: string | null
}

interface ReceiptRow {
  id: string
  receipt_no: string | null
  receipt_date: string | null
  actual_amount: number | null
  bank_account_last5: string | null
  status: string | null
}

interface InvoiceRow {
  id: string
  total_amount: number
  paid_amount: number
  status: string
  created_at: string
  due_date: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待匯款',
  partial: '部分付款',
  paid: '已付清',
  overdue: '已逾期',
  cancelled: '已取消',
  pending_verify: '待確認',
  confirmed: '已確認',
  refunded: '已退款',
  rejected: '已退回',
  draft: '草稿',
  unpaid: '未付款',
}

const STATUS_COLOR: Record<string, string> = {
  paid: 'text-morandi-income',
  confirmed: 'text-morandi-income',
  partial: 'text-morandi-gold',
  pending: 'text-morandi-secondary',
  pending_verify: 'text-morandi-gold',
  overdue: 'text-status-danger',
  cancelled: 'text-status-danger',
  rejected: 'text-status-danger',
  refunded: 'text-morandi-secondary',
  unpaid: 'text-status-danger',
}

function StatusBadge({ status }: { status: string | null }) {
  const label = STATUS_LABEL[status || ''] || status || '—'
  const color = STATUS_COLOR[status || ''] || 'text-morandi-secondary'
  return <span className={`text-xs font-medium ${color}`}>{label}</span>
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabValue>('basic')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [receipts, setReceipts] = useState<ReceiptRow[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [tabLoading, setTabLoading] = useState(false)

  // 載入客戶基本資料
  useEffect(() => {
    void (async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) {
        logger.error('載入顧客失敗:', error.message)
      }
      setCustomer((data as unknown as Customer) || null)
      setLoading(false)
    })()
  }, [id])

  // 各 tab 切換時拉資料
  useEffect(() => {
    if (!customer) return
    if (activeTab === 'basic') return

    void (async () => {
      setTabLoading(true)
      try {
        if (activeTab === 'orders') {
          const { data } = await supabase
            .from('orders')
            .select('id, order_number, tour_code, total_amount, payment_status, created_at')
            .eq('customer_id', id)
            .order('created_at', { ascending: false })
            .limit(100)
          setOrders((data as unknown as OrderRow[]) || [])
        } else if (activeTab === 'transactions') {
          const { data } = await supabase
            .from('receipts')
            .select('id, receipt_no, receipt_date, actual_amount, bank_account_last5, status')
            .eq('customer_id', id)
            .order('receipt_date', { ascending: false })
            .limit(100)
          setReceipts((data as unknown as ReceiptRow[]) || [])
        } else if (activeTab === 'invoices') {
          const { data } = await dynamicFrom('invoices')
            .select('id, total_amount, paid_amount, status, created_at, due_date')
            .eq('customer_id', id)
            .order('created_at', { ascending: false })
            .limit(100)
          setInvoices((data as InvoiceRow[]) || [])
        }
      } catch (err) {
        logger.error(`載入 ${activeTab} 失敗:`, err)
      } finally {
        setTabLoading(false)
      }
    })()
  }, [activeTab, customer, id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" className="text-morandi-secondary" />
      </div>
    )
  }

  if (!customer) {
    return (
      <ContentPageLayout title={PAGE_LABELS.TITLE} icon={User}>
        <div className="flex-1 flex items-center justify-center text-morandi-secondary">
          {PAGE_LABELS.NOT_FOUND}
        </div>
      </ContentPageLayout>
    )
  }

  const tabs = [
    { value: 'basic', label: PAGE_LABELS.TAB_BASIC, icon: User },
    { value: 'orders', label: PAGE_LABELS.TAB_ORDERS, icon: ShoppingBag },
    { value: 'transactions', label: PAGE_LABELS.TAB_TRANSACTIONS, icon: Wallet },
    { value: 'invoices', label: PAGE_LABELS.TAB_INVOICES, icon: FileText },
  ]

  const orderColumns: TableColumn<OrderRow>[] = [
    {
      key: 'order_number',
      label: '訂單號',
      width: '140',
      render: v => <span className="font-mono text-sm">{String(v || '')}</span>,
    },
    {
      key: 'tour_code',
      label: '團號',
      width: '140',
      render: v => <span className="font-mono text-sm">{String(v || '')}</span>,
    },
    {
      key: 'total_amount',
      label: '金額',
      width: '120',
      align: 'right',
      render: v => <CurrencyCell amount={Number(v) || 0} />,
    },
    {
      key: 'payment_status',
      label: '付款狀態',
      width: '100',
      render: v => <StatusBadge status={v as string | null} />,
    },
    {
      key: 'created_at',
      label: '建立日期',
      width: '110',
      render: v => <DateCell date={v as string} />,
    },
  ]

  const receiptColumns: TableColumn<ReceiptRow>[] = [
    {
      key: 'receipt_no',
      label: '收款單號',
      width: '140',
      render: v => <span className="font-mono text-sm">{String(v || '')}</span>,
    },
    {
      key: 'receipt_date',
      label: '收款日',
      width: '110',
      render: v => <DateCell date={v as string} />,
    },
    {
      key: 'actual_amount',
      label: '實收金額',
      width: '120',
      align: 'right',
      render: v => <CurrencyCell amount={Number(v) || 0} variant="income" />,
    },
    {
      key: 'bank_account_last5',
      label: '後五碼',
      width: '90',
      render: v => <span className="font-mono text-xs">{String(v || '—')}</span>,
    },
    {
      key: 'status',
      label: '狀態',
      width: '100',
      render: v => <StatusBadge status={v as string | null} />,
    },
  ]

  const invoiceColumns: TableColumn<InvoiceRow>[] = [
    {
      key: 'created_at',
      label: '開立日',
      width: '110',
      render: v => <DateCell date={v as string} />,
    },
    {
      key: 'due_date',
      label: '到期日',
      width: '110',
      render: v => <DateCell date={v as string} />,
    },
    {
      key: 'total_amount',
      label: '應收',
      width: '120',
      align: 'right',
      render: v => <CurrencyCell amount={Number(v) || 0} />,
    },
    {
      key: 'paid_amount',
      label: '已收',
      width: '120',
      align: 'right',
      render: v => <CurrencyCell amount={Number(v) || 0} variant="income" />,
    },
    {
      key: 'status',
      label: '狀態',
      width: '100',
      render: v => <StatusBadge status={v as string | null} />,
    },
  ]

  const handleSave = async (data: Partial<Customer>) => {
    await updateCustomer(id, data as never)
    // refresh
    const { data: refreshed } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    setCustomer((refreshed as unknown as Customer) || null)
    setEditOpen(false)
  }

  return (
    <ContentPageLayout
      title={`${customer.name || '(未命名)'} — ${customer.code || ''}`}
      icon={User}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={v => setActiveTab(v as TabValue)}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft size={14} className="mr-1" />
            {PAGE_LABELS.BACK}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit size={14} className="mr-1" />
            {PAGE_LABELS.EDIT}
          </Button>
        </div>
      }
    >
      <div>
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabValue)}>
          <TabsContent value="basic" className="mt-0">
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <Field label="客戶編號" value={customer.code} mono />
                <Field label="姓名" value={customer.name} />
                <Field label="英文姓名" value={customer.english_name} />
                <Field label="外號" value={customer.nickname} />
                <Field label="主要電話" value={customer.phone} />
                <Field label="備用電話" value={customer.alternative_phone} />
                <Field label="Email" value={customer.email} />
                <Field label="身分證" value={customer.national_id} />
                <Field label="護照號碼" value={customer.passport_number} />
                <Field label="護照姓名" value={customer.passport_name} />
                <Field label="護照效期" value={customer.passport_expiry} />
                <Field label="出生日期" value={customer.birth_date} />
                <Field label="性別" value={customer.gender} />
                <Field label="國籍" value={customer.nationality} />
                <Field label="地址" value={customer.address} full />
                <Field label="會員類型" value={customer.member_type} />
                <Field label="VIP 等級" value={customer.vip_level} />
                <Field label="客戶來源" value={customer.source} />
                <Field label="飲食禁忌" value={customer.dietary_restrictions} full />
                <Field label="備註" value={customer.notes} full />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-0">
            {tabLoading ? (
              <LoadingBlock />
            ) : orders.length === 0 ? (
              <Card className="p-8 text-center text-morandi-secondary">
                {PAGE_LABELS.EMPTY_ORDERS}
              </Card>
            ) : (
              <EnhancedTable columns={orderColumns} data={orders} />
            )}
          </TabsContent>

          <TabsContent value="transactions" className="mt-0">
            {tabLoading ? (
              <LoadingBlock />
            ) : receipts.length === 0 ? (
              <Card className="p-8 text-center text-morandi-secondary">
                {PAGE_LABELS.EMPTY_TRANSACTIONS}
              </Card>
            ) : (
              <EnhancedTable columns={receiptColumns} data={receipts} />
            )}
          </TabsContent>

          <TabsContent value="invoices" className="mt-0">
            {tabLoading ? (
              <LoadingBlock />
            ) : invoices.length === 0 ? (
              <Card className="p-8 text-center text-morandi-secondary">
                {PAGE_LABELS.EMPTY_INVOICES}
              </Card>
            ) : (
              <EnhancedTable columns={invoiceColumns} data={invoices} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {customer && (
        <CustomerDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          customer={customer}
          mode="edit"
          onSave={handleSave}
        />
      )}
    </ContentPageLayout>
  )
}

function Field({
  label,
  value,
  mono = false,
  full = false,
}: {
  label: string
  value?: string | null
  mono?: boolean
  full?: boolean
}) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <div className="text-xs text-morandi-secondary mb-0.5">{label}</div>
      <div className={`${mono ? 'font-mono' : ''} text-morandi-primary`}>{value || '—'}</div>
    </div>
  )
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Spinner size="lg" className="text-morandi-secondary" />
    </div>
  )
}
