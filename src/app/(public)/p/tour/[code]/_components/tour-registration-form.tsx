'use client'

/**
 * TourRegistrationForm
 * 公開報名表單
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Check, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface TourRegistrationFormProps {
  tourId: string
  tourCode: string
  salesRef: string | null
  onSuccess?: () => void
}

export function TourRegistrationForm({
  tourId,
  tourCode,
  salesRef,
  onSuccess,
}: TourRegistrationFormProps) {
  const t = useTranslations('publicPage')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    passengerCount: '1',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.customerName.trim()) {
      newErrors.customerName = '請填寫姓名'
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = '請填寫 Email'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Email 格式不正確'
    }

    if (formData.passengerCount && parseInt(formData.passengerCount) < 1) {
      newErrors.passengerCount = '人數必須大於 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    try {
      const response = await fetch('/api/public/registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tourId,
          tourCode,
          salesRef,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone || null,
          passengerCount: parseInt(formData.passengerCount) || 1,
          notes: formData.notes || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        toast.success('報名成功！我們將盡快與您聯繫')
        onSuccess?.()
      } else {
        toast.error(result.error || '報名失敗，請稍後再試')
      }
    } catch (err) {
      toast.error('網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  if (success) {
    return (
      <div className="bg-status-success-bg border border-status-success/30 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-status-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-6 h-6 text-status-success" />
        </div>
        <h3 className="text-lg font-semibold text-status-success mb-2">報名成功！</h3>
        <p className="text-sm text-status-success">我們將盡快與您聯繫，感謝您的報名！</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customerName">姓名 *</Label>
        <Input
          id="customerName"
          name="customerName"
          value={formData.customerName}
          onChange={handleChange}
          placeholder="請填寫您的姓名"
          className={errors.customerName ? 'border-status-danger' : ''}
        />
        {errors.customerName && (
          <p className="text-xs text-status-danger flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {errors.customerName}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerEmail">Email *</Label>
        <Input
          id="customerEmail"
          name="customerEmail"
          type="email"
          value={formData.customerEmail}
          onChange={handleChange}
          placeholder="example@email.com"
          className={errors.customerEmail ? 'border-status-danger' : ''}
        />
        {errors.customerEmail && (
          <p className="text-xs text-status-danger flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {errors.customerEmail}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerPhone">電話（選填）</Label>
        <Input
          id="customerPhone"
          name="customerPhone"
          type="tel"
          value={formData.customerPhone}
          onChange={handleChange}
          placeholder="0912345678"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="passengerCount">報名人數</Label>
        <Input
          id="passengerCount"
          name="passengerCount"
          type="number"
          min="1"
          value={formData.passengerCount}
          onChange={handleChange}
          className={errors.passengerCount ? 'border-status-danger' : ''}
        />
        {errors.passengerCount && (
          <p className="text-xs text-status-danger flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {errors.passengerCount}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">備註（選填）</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="有什麼想補充的嗎？"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            送出中...
          </>
        ) : (
          '提交報名'
        )}
      </Button>
    </form>
  )
}
