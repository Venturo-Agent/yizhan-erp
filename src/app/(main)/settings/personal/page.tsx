'use client'

import { useAuthStore } from '@/stores/auth-store'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Lock } from 'lucide-react'
import { useSettingsState } from '../hooks/useSettingsState'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SettingsTabs } from '../components/SettingsTabs'
import { EmployeeForm } from '@/app/(main)/hr/_components/EmployeeForm'
import { FormDialog } from '@/components/dialog'
import { ThemeSwitcher } from '@/components/ui/theme-switcher'
import { FontScaleSwitcher } from '@/components/ui/font-scale-switcher'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { COMMON_MESSAGES } from '@/constants/messages'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function SettingsPage() {
  const t = useTranslations('settingsPage')
  const { user } = useAuthStore()
  const searchParams = useSearchParams()
  const router = useRouter()

  const {
    showPasswordSection,
    setShowPasswordSection,
    passwordData,
    setPasswordData,
    showPassword,
    setShowPassword,
    passwordUpdateLoading,
    setPasswordUpdateLoading,
  } = useSettingsState()

  // 若 URL 有 ?setup=true，自動展開改密碼區塊
  useEffect(() => {
    if (searchParams.get('setup') === 'true') {
      setShowPasswordSection(true)
    }
  }, [searchParams, setShowPasswordSection])

  // settings 模組任一 tab 有讀權即顯示 tab 列
  const { canReadAnyInModule } = useMyCapabilities()
  const hasSettingsAccess = canReadAnyInModule('settings')

  return (
    <ContentPageLayout
      title={t('settings')}
      contentClassName="flex-1 overflow-y-auto min-h-0 flex flex-col"
      headerActions={
        <div className="flex items-center gap-4">
          {hasSettingsAccess && <SettingsTabs />}
        </div>
      }
    >
      {/* 5/13 William 拍板 v3：顯示偏好放照片右邊、跟照片同一橫排、不獨立卡片 */}
      <EmployeeForm
        employeeId={user?.id}
        mode="self"
        onSubmit={() => {
          window.location.reload()
        }}
        onCancel={() => {
          router.back()
        }}
        onPasswordChange={() => setShowPasswordSection(true)}
        headerRightSlot={
          // 5/13 W 反饋：ThemeSwitcher / FontScaleSwitcher 內建已有 label、外層不再包 label 避免重複
          <div className="flex items-center gap-6">
            <ThemeSwitcher />
            <FontScaleSwitcher />
          </div>
        }
      />

        {/* 修改密碼 Dialog */}
        <FormDialog
          open={showPasswordSection}
          onOpenChange={setShowPasswordSection}
          title={
            <span className="text-morandi-primary flex items-center gap-2">
              <Lock className="w-5 h-5 text-morandi-gold" />
              {t('changePassword')}
            </span>
          }
          cancelLabel="取消"
          onCancel={() => {
            setShowPasswordSection(false)
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
          }}
          submitLabel={passwordUpdateLoading ? COMMON_MESSAGES.PROCESSING : t('confirmChange')}
          submitDisabled={passwordUpdateLoading}
          loading={passwordUpdateLoading}
          onSubmit={async () => {
            if (passwordData.newPassword !== passwordData.confirmPassword) {
              toast.error(t('passwordsNotMatch'))
              return
            }
            if (passwordData.newPassword.length < 6) {
              toast.error(COMMON_MESSAGES.PASSWORD_TOO_SHORT(6))
              return
            }
            setPasswordUpdateLoading(true)
            try {
              const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  employee_number: user?.employee_number,
                  current_password: passwordData.currentPassword,
                  new_password: passwordData.newPassword,
                }),
              })
              const data = await res.json()
              if (data.success) {
                // Supabase admin.updateUserById 改完密碼會 invalidate 舊 session
                // 必須用新密碼重新 signInWithPassword 拿 fresh session、否則後續所有 API 都 401
                // 對齊 /change-password page 的 re-signIn 邏輯（之前漏這層、user 改完密碼整站 401）
                const authEmail = data.data?.authEmail as string | undefined
                if (authEmail) {
                  const { supabase } = await import('@/lib/supabase/client')
                  const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: authEmail,
                    password: passwordData.newPassword,
                  })
                  if (signInError) {
                    toast.success(t('passwordUpdateSuccess') + '（請重新登入）')
                    window.location.href = '/login'
                    return
                  }
                }
                toast.success(t('passwordUpdateSuccess'))
                setShowPasswordSection(false)
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
              } else {
                toast.error(data.error ?? t('passwordUpdateError'))
              }
            } catch (_error) {
              toast.error(t('passwordUpdateError'))
            } finally {
              setPasswordUpdateLoading(false)
            }
          }}
          maxWidth="sm"
        >
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {t('currentPassword')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={e =>
                  setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))
                }
                className="w-full px-3 py-2 border border-morandi-container/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
                placeholder={t('currentPasswordPlaceholder')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {t('newPassword')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={e =>
                  setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))
                }
                className="w-full px-3 py-2 border border-morandi-container/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
                placeholder={t('newPasswordPlaceholder')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {t('confirmNewPassword')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={e =>
                  setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))
                }
                className="w-full px-3 py-2 border border-morandi-container/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
                placeholder={t('confirmPasswordPlaceholder')}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={e => setShowPassword(e.target.checked)}
                className="rounded border-morandi-container/30 accent-[var(--morandi-gold)]"
              />
              <label htmlFor="showPassword" className="text-sm text-morandi-primary">
                {t('showPassword')}
              </label>
            </div>
          </div>
        </FormDialog>
    </ContentPageLayout>
  )
}
