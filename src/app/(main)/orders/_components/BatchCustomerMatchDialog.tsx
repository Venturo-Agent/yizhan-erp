'use client'
/**
 * BatchCustomerMatchDialog — 批次「比對顧客」審核清單對話框
 *
 * 規格（2026-05-26 設計提案第四節）：
 *   比對結果（N 筆）                          [全部套用] [取消]
 *   ─────────────────────────────────────────
 *   ✓ 王小明 → 對到舊客 C000123（身分證相符）   自動連結
 *   ⚠ 林聖芬 → 找到 2 個同名，請選 ▾          [C000252 / C000301 / 建新 / 略過]
 *   ＋ 周新客 → 查無 → 將建立新顧客
 *
 * UI：沿用同資料夾 Dialog + 表格 + 原生 <select>（比照 PnrMatchDialog.table）+ design token。
 * 防連點：套用按鈕 disabled={isApplying}。
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, AlertTriangle, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { BatchMatchRow, BatchResolution } from '../_hooks/useBatchCustomerMatch'

interface BatchCustomerMatchDialogProps {
  open: boolean
  rows: BatchMatchRow[]
  isApplying: boolean
  onClose: () => void
  onChangeResolution: (memberId: string, resolution: BatchResolution) => void
  onApplyAll: () => void
}

// 把當前 resolution 編碼成 <select> 的 value 字串
function resolutionToValue(res: BatchResolution): string {
  if (res.type === 'link') return `link:${res.customerId}`
  return res.type // 'create' | 'skip'
}

function valueToResolution(value: string): BatchResolution {
  if (value.startsWith('link:')) return { type: 'link', customerId: value.slice(5) }
  if (value === 'create') return { type: 'create' }
  return { type: 'skip' }
}

export function BatchCustomerMatchDialog({
  open,
  rows,
  isApplying,
  onClose,
  onChangeResolution,
  onApplyAll,
}: BatchCustomerMatchDialogProps) {
  const t = useTranslations('orders')

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent level={2} className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('batchMatchTitle', { count: rows.length })}</DialogTitle>
          <DialogDescription>{t('batchMatchDesc')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-morandi-muted">
              {t('batchMatchEmpty')}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-morandi-gold-header">
                  <tr className="text-left text-xs text-morandi-secondary">
                    <th className="w-10 px-2 py-2"></th>
                    <th className="px-2 py-2">{t('batchMatchMember')}</th>
                    <th className="px-2 py-2">{t('batchMatchResult')}</th>
                    <th className="w-[200px] px-2 py-2">{t('batchMatchAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.member.id} className="border-t border-border/60">
                      {/* 狀態圖示 */}
                      <td className="px-2 py-2 align-top">
                        {row.kind === 'matched' && (
                          <Check size={16} className="text-status-success" />
                        )}
                        {row.kind === 'ambiguous' && (
                          <AlertTriangle size={16} className="text-status-warning" />
                        )}
                        {row.kind === 'none' && <UserPlus size={16} className="text-status-info" />}
                      </td>

                      {/* 團員名字 */}
                      <td className="px-2 py-2 align-top">
                        <span className="font-medium text-morandi-primary">
                          {row.member.chinese_name || row.member.passport_name || '—'}
                        </span>
                        <div className="mt-0.5 text-xs text-morandi-muted">
                          {row.member.id_number && (
                            <span className="mr-2">
                              {t('idNumberLabel')}
                              {row.member.id_number}
                            </span>
                          )}
                          {row.member.passport_number && (
                            <span>
                              {t('passportNumberLabel')}
                              {row.member.passport_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 比對結果說明 */}
                      <td className="px-2 py-2 align-top text-xs">
                        {row.kind === 'matched' && (
                          <span className="text-status-success">
                            {t('batchMatchMatched', {
                              code: row.matched?.code || row.matched?.name || '',
                              reason:
                                row.reason === 'national_id'
                                  ? t('batchMatchReasonId')
                                  : t('batchMatchReasonPassport'),
                            })}
                          </span>
                        )}
                        {row.kind === 'ambiguous' && (
                          <span className="text-status-warning">
                            {t('batchMatchAmbiguous', { count: row.candidates.length })}
                          </span>
                        )}
                        {row.kind === 'none' && (
                          <span className="text-status-info">{t('batchMatchNone')}</span>
                        )}
                      </td>

                      {/* 處置 */}
                      <td className="px-2 py-2 align-top">
                        {row.kind === 'matched' ? (
                          <span className="text-xs text-status-success">
                            {t('batchMatchAutoLink')}
                          </span>
                        ) : (
                          <select
                            className="w-full max-w-[190px] rounded border px-2 py-1 text-xs"
                            value={resolutionToValue(row.resolution)}
                            disabled={isApplying}
                            onChange={e =>
                              onChangeResolution(row.member.id, valueToResolution(e.target.value))
                            }
                          >
                            {/* 候選既有顧客（撞名時才有） */}
                            {row.candidates.map(c => (
                              <option key={c.id} value={`link:${c.id}`}>
                                {t('batchMatchOptLink', { name: c.name, code: c.code || '' })}
                              </option>
                            ))}
                            <option value="create">{t('batchMatchOptCreate')}</option>
                            <option value="skip">{t('batchMatchOptSkip')}</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isApplying}>
            {t('cancel')}
          </Button>
          <Button onClick={onApplyAll} disabled={isApplying || rows.length === 0}>
            {isApplying ? t('batchMatchApplying') : t('batchMatchApplyAll')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
