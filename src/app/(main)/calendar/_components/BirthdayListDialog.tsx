'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Cake, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { formatYearMonth } from '@/lib/utils/format-date'
import { useTranslations } from 'next-intl'

interface BirthdayPerson {
  id: string
  name: string
  birth_date: string
  day: number
}

interface BirthdayListDialogProps {
  open: boolean
  onClose: () => void
  initialMonth?: Date
}

export function BirthdayListDialog({ open, onClose, initialMonth }: BirthdayListDialogProps) {
  const t = useTranslations('calendarPage')
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(() => initialMonth || new Date())
  const [birthdays, setBirthdays] = useState<BirthdayPerson[]>([])
  const [loading, setLoading] = useState(false)

  // 點卡片：關 dialog + 跳顧客詳情（顯示照片 / 完整資料）
  const handleOpenCustomer = (customerId: string) => {
    onClose()
    router.push(`/library/customers/${customerId}`)
  }

  // 取得月份字串
  const getMonthLabel = (date: Date) => {
    return formatYearMonth(date)
  }

  // 取得當月的 MM 格式（用於查詢）
  const getMonthString = (date: Date) => {
    return String(date.getMonth() + 1).padStart(2, '0')
  }

  // 查詢生日資料（只查客戶，因為團員都會導入客戶資料）
  const fetchBirthdays = useCallback(async () => {
    setLoading(true)
    try {
      const monthStr = getMonthString(currentMonth)
      const results: BirthdayPerson[] = []

      // 查詢客戶生日
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, birth_date')
        .not('birth_date', 'is', null)

      if (customers) {
        customers.forEach(customer => {
          if (customer.birth_date) {
            // birth_date 格式: YYYY-MM-DD
            const birthMonth = customer.birth_date.slice(5, 7)
            if (birthMonth === monthStr) {
              const day = parseInt(customer.birth_date.slice(8, 10), 10)
              results.push({
                id: customer.id,
                name: customer.name,
                birth_date: customer.birth_date,
                day,
              })
            }
          }
        })
      }

      // 按日期排序
      results.sort((a, b) => a.day - b.day)
      setBirthdays(results)
    } catch (error) {
      logger.error('查詢生日失敗:', error)
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  // 當月份變更或對話框開啟時查詢
  useEffect(() => {
    if (open) {
      fetchBirthdays()
    }
  }, [open, fetchBirthdays])

  // 上一個月
  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() - 1)
      return newDate
    })
  }

  // 下一個月
  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + 1)
      return newDate
    })
  }

  // 回到本月
  const handleToday = () => {
    setCurrentMonth(new Date())
  }

  // 格式化生日日期
  const formatBirthday = (dateStr: string) => {
    const month = parseInt(dateStr.slice(5, 7), 10)
    const day = parseInt(dateStr.slice(8, 10), 10)
    return `${month}/${day}`
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent level={1} className="!max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake size={20} className="text-morandi-gold" />
            {t('birthdayList')}
          </DialogTitle>
        </DialogHeader>

        {/* 月份切換 */}
        <div className="flex items-center justify-between py-2 border-b border-border">
          <Button variant="ghost" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0">
            <ChevronLeft size={18} />
          </Button>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-morandi-primary">
              {getMonthLabel(currentMonth)}
            </span>
            <Button
              variant="soft-gold"
              size="sm"
              onClick={handleToday}
              className="h-6 px-2 text-xs"
            >
              {t('thisMonth')}
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
            <ChevronRight size={18} />
          </Button>
        </div>

        {/* 生日名單 — grid 2-3 欄、卡片風格對齊登入頁 */}
        <div className="max-h-[60vh] overflow-y-auto px-1 py-2">
          {loading ? (
            <div className="py-12 text-center text-morandi-secondary">{t('loading')}</div>
          ) : birthdays.length === 0 ? (
            <div className="py-12 text-center text-morandi-secondary">
              {t('noBirthdayThisMonth')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {birthdays.map(person => (
                /* eslint-disable-next-line venturo/no-forbidden-classes */
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleOpenCustomer(person.id)}
                  className="text-left bg-gradient-to-t from-white to-morandi-cream rounded-[28px] px-5 py-4 border-[3px] border-white shadow-[rgba(180,160,120,0.35)_0px_18px_22px_-16px] transition-all hover:-translate-y-0.5 hover:shadow-[rgba(180,160,120,0.5)_0px_24px_28px_-18px] focus-visible:outline-2 focus-visible:outline-morandi-gold cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {/* 日期方塊 */}
                    <div className="shrink-0 w-14 h-14 rounded-2xl bg-morandi-gold/15 flex flex-col items-center justify-center">
                      <div className="text-xl font-black text-morandi-gold leading-none">
                        {person.day}
                      </div>
                      <div className="text-[0.588rem] text-morandi-gold/70 mt-0.5">
                        {formatBirthday(person.birth_date)}
                      </div>
                    </div>

                    {/* 姓名 + 蛋糕 icon */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-morandi-primary truncate">
                        {person.name}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-morandi-secondary">
                        <Cake size={12} className="text-morandi-gold/70" />
                        <span>{t('birthdayList')}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 統計 */}
        {!loading && birthdays.length > 0 && (
          <div className="pt-2 border-t border-border text-sm text-morandi-secondary text-center">
            {t('monthlyBirthdayCountPrefix')}
            {birthdays.length}
            {t('monthlyBirthdayCountSuffix')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
