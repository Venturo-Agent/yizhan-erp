'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Input } from '@/components/ui/input'
import { dynamicFrom } from '@/lib/supabase/typed-client'

interface Bank {
  bank_code: string
  bank_name: string
  english_name: string | null
  swift_code: string | null
  is_active: boolean
  display_order: number
}

async function fetchBanks(): Promise<Bank[]> {
  const { data, error } = await dynamicFrom('ref_banks')
    .select('bank_code, bank_name, english_name, swift_code, is_active, display_order')
    .order('display_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as Bank[]
}

export default function SharedDataBanksPage() {
  const t = useTranslations('sharedData')
  const [search, setSearch] = useState('')
  const { data: banks = [], isLoading } = useSWR<Bank[]>('shared-data:banks', fetchBanks, {
    revalidateOnFocus: false,
    dedupingInterval: 60 * 60 * 1000,
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return banks
    return banks.filter(
      b =>
        b.bank_code.includes(q) ||
        b.bank_name.toLowerCase().includes(q) ||
        (b.english_name?.toLowerCase().includes(q) ?? false)
    )
  }, [banks, search])

  return (
    <ContentPageLayout title={t('moduleBanks')}>
      <div className='space-y-4'>
        <div className='flex items-center justify-between gap-4'>
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchPlaceholderBanks')}
            className='max-w-sm'
          />
          <span className='text-sm text-muted-foreground'>
            {t('totalRows', { n: filtered.length })}
          </span>
        </div>

        <div className='rounded-md border'>
          <table className='w-full text-sm'>
            <thead className='border-b bg-muted/50'>
              <tr>
                <th className='px-4 py-2 text-left'>{t('colCode')}</th>
                <th className='px-4 py-2 text-left'>{t('colNameZh')}</th>
                <th className='px-4 py-2 text-left'>{t('colSwift')}</th>
                <th className='px-4 py-2 text-center'>{t('colEnabled')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className='px-4 py-8 text-center text-muted-foreground'>
                    {t('loading')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className='px-4 py-8 text-center text-muted-foreground'>
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.bank_code} className='border-b last:border-0 hover:bg-muted/30'>
                    <td className='px-4 py-2 font-mono'>{b.bank_code}</td>
                    <td className='px-4 py-2'>{b.bank_name}</td>
                    <td className='px-4 py-2 font-mono text-muted-foreground'>{b.swift_code ?? '—'}</td>
                    <td className='px-4 py-2 text-center'>{b.is_active ? '✓' : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ContentPageLayout>
  )
}
