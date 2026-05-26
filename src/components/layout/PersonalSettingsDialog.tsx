'use client'

import { useRef, useState } from 'react'
import { Camera, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeSwitcher } from '@/components/ui/theme-switcher'
import { FontScaleSwitcher } from '@/components/ui/font-scale-switcher'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceId } from '@/lib/workspace-context'
import { logger } from '@/lib/utils/logger'
import { COMMON_MESSAGES } from '@/constants/messages'

/**
 * 個人偏好 dialog（側邊欄底部「扳手」開啟）
 *
 * 2026-05-26 William 拍板：舊「個人設定」整張 EmployeeForm 過於龐大、HR 資料不該自改。
 * 改成只保留 4 個「真的該讓使用者自己改」的項目：上傳照片 / 主題 / 字體大小 / 修改密碼。
 * 個人 HR 資料（姓名、職稱、聯絡方式…）一律由 HR 管理、員工不可自改。
 */
const LABELS = {
  TITLE: '個人偏好',
  PHOTO: '照片',
  UPLOAD: '上傳照片',
  UPLOADING: '上傳中…',
  AVATAR_ALT: '頭像',
  THEME: '主題',
  FONT_SIZE: '字體大小',
  ACCOUNT_SECURITY: '帳號安全',
  CHANGE_PASSWORD: '修改密碼',
  CURRENT_PASSWORD: '目前密碼',
  NEW_PASSWORD: '新密碼',
  CONFIRM_PASSWORD: '確認新密碼',
  SHOW_PASSWORD: '顯示密碼',
  CONFIRM: '確認修改',
  CANCEL: '取消',
} as const

const MSG = {
  NO_SESSION: '找不到登入資訊、請重新登入',
  AVATAR_OK: '頭像已更新',
  AVATAR_FAIL: '頭像上傳失敗',
  UPLOAD_FAIL: '上傳失敗',
  AVATAR_SAVE_FAIL: '頭像儲存失敗',
  PWD_MISMATCH: '兩次新密碼不一致',
  PWD_OK: '密碼已更新',
  PWD_OK_RELOGIN: '密碼已更新（請重新登入）',
  PWD_FAIL: '密碼更新失敗',
} as const

const SECTION_TITLE = 'text-sm font-medium text-morandi-primary mb-2'

export function PersonalSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuthStore()
  const workspaceId = useWorkspaceId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 頭像
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url ?? null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // 修改密碼（巢狀 dialog）
  const [showPassword, setShowPassword] = useState(false)
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [showPwdText, setShowPwdText] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)

  const resetPwd = () => setPwd({ current: '', next: '', confirm: '' })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!workspaceId || !user?.id) {
      toast.error(MSG.NO_SESSION)
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)

    setAvatarUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `${workspaceId}/${user.id}-${Date.now()}.${ext}`
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', 'user-avatars')
      fd.append('path', path)

      const res = await fetch('/api/storage/upload', { method: 'POST', body: fd })
      const json = (await res.json()) as { data?: { publicUrl?: string }; message?: string }
      if (!res.ok || !json.data?.publicUrl) throw new Error(json.message || MSG.UPLOAD_FAIL)

      // 存回「自己的」avatar_url（自助 API、不需 HR 權限）
      const saveRes = await fetch('/api/auth/profile/avatar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: json.data.publicUrl }),
      })
      if (!saveRes.ok) throw new Error(MSG.AVATAR_SAVE_FAIL)

      setAvatarPreview(json.data.publicUrl)
      toast.success(MSG.AVATAR_OK)
    } catch (err) {
      logger.error('avatar upload failed', err)
      toast.error(MSG.AVATAR_FAIL)
      setAvatarPreview(user?.avatar_url ?? null)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleChangePassword = async () => {
    if (pwd.next !== pwd.confirm) {
      toast.error(MSG.PWD_MISMATCH)
      return
    }
    if (pwd.next.length < 6) {
      toast.error(COMMON_MESSAGES.PASSWORD_TOO_SHORT(6))
      return
    }
    setPwdLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_number: user?.employee_number,
          current_password: pwd.current,
          new_password: pwd.next,
        }),
      })
      const data = await res.json()
      if (data.success) {
        // 改完密碼舊 session 失效、用新密碼重新登入拿 fresh session（對齊舊個人設定頁邏輯）
        const authEmail = data.data?.authEmail as string | undefined
        if (authEmail) {
          const { supabase } = await import('@/lib/supabase/client')
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password: pwd.next,
          })
          if (signInError) {
            toast.success(MSG.PWD_OK_RELOGIN)
            window.location.href = '/login'
            return
          }
        }
        toast.success(MSG.PWD_OK)
        setShowPassword(false)
        resetPwd()
      } else {
        toast.error(data.error ?? MSG.PWD_FAIL)
      }
    } catch {
      toast.error(MSG.PWD_FAIL)
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={LABELS.TITLE}
        maxWidth="md"
        showFooter={false}
        loading={false}
      >
        <div className="space-y-6 py-2">
          {/* 上傳照片 */}
          <section>
            <h4 className={SECTION_TITLE}>{LABELS.PHOTO}</h4>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-xl bg-morandi-gold/10 border-2 border-dashed border-morandi-gold/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-morandi-gold transition-all"
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={LABELS.AVATAR_ALT}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-6 h-6 text-morandi-secondary" />
                )}
              </div>
              <Button
                type="button"
                variant="header-outline"
                size="sm"
                disabled={avatarUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUploading ? LABELS.UPLOADING : LABELS.UPLOAD}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </section>

          {/* 主題 */}
          <section>
            <h4 className={SECTION_TITLE}>{LABELS.THEME}</h4>
            <ThemeSwitcher showLabel={false} />
          </section>

          {/* 字體大小 */}
          <section>
            <h4 className={SECTION_TITLE}>{LABELS.FONT_SIZE}</h4>
            <FontScaleSwitcher showLabel={false} />
          </section>

          {/* 修改密碼 */}
          <section>
            <h4 className={SECTION_TITLE}>{LABELS.ACCOUNT_SECURITY}</h4>
            <Button
              type="button"
              variant="header-outline"
              size="sm"
              onClick={() => setShowPassword(true)}
            >
              <Lock className="w-4 h-4 mr-1.5" />
              {LABELS.CHANGE_PASSWORD}
            </Button>
          </section>
        </div>
      </FormDialog>

      {/* 修改密碼 子 dialog */}
      <FormDialog
        open={showPassword}
        onOpenChange={o => {
          setShowPassword(o)
          if (!o) resetPwd()
        }}
        nested
        level={2}
        maxWidth="sm"
        title={
          <span className="text-morandi-primary flex items-center gap-2">
            <Lock className="w-5 h-5 text-morandi-gold" />
            {LABELS.CHANGE_PASSWORD}
          </span>
        }
        submitLabel={pwdLoading ? COMMON_MESSAGES.PROCESSING : LABELS.CONFIRM}
        submitDisabled={pwdLoading}
        loading={pwdLoading}
        cancelLabel={LABELS.CANCEL}
        onCancel={() => {
          setShowPassword(false)
          resetPwd()
        }}
        onSubmit={handleChangePassword}
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-morandi-primary">
              {LABELS.CURRENT_PASSWORD}
            </label>
            <Input
              type={showPwdText ? 'text' : 'password'}
              value={pwd.current}
              onChange={e => setPwd(prev => ({ ...prev, current: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-morandi-primary">
              {LABELS.NEW_PASSWORD}
            </label>
            <Input
              type={showPwdText ? 'text' : 'password'}
              value={pwd.next}
              onChange={e => setPwd(prev => ({ ...prev, next: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-morandi-primary">
              {LABELS.CONFIRM_PASSWORD}
            </label>
            <Input
              type={showPwdText ? 'text' : 'password'}
              value={pwd.confirm}
              onChange={e => setPwd(prev => ({ ...prev, confirm: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-morandi-primary">
            <input
              type="checkbox"
              checked={showPwdText}
              onChange={e => setShowPwdText(e.target.checked)}
              className="rounded border-morandi-container/30 accent-[var(--morandi-gold)]"
            />
            {LABELS.SHOW_PASSWORD}
          </label>
        </div>
      </FormDialog>
    </>
  )
}
