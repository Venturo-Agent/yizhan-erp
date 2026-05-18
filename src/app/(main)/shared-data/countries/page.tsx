'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Input } from '@/components/ui/input'
import { dynamicFrom } from '@/lib/supabase/typed-client'

interface Country {
  code: string
  name_zh: string
  name_en: string
  continent: string | null
  sub_region: string | null
  is_active: boolean
}

async function fetchCountries(): Promise<Country[]> {
  const { data, error } = await dynamicFrom('ref_countries')
    .select('code, name_zh, name_en, continent, sub_region, is_active')
    .order('code', { ascending: true })
  if (error) throw error
  return (data ?? []) as Country[]
}

export default function SharedDataCountriesPage() {
  const t = useTranslations('sharedData')
  const [search, setSearch] = useState('')
  const { data: countries = [], isLoading } = useSWR<Country[]>(
    'shared-data:countries',
    fetchCountries,
    { revalidateOnFocus: false, dedupingInterval: 60 * 60 * 1000 }
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return countries
    return countries.filter(
      c =>
        c.code.toLowerCase().includes(q) ||
        c.name_zh.toLowerCase().includes(q) ||
        c.name_en.toLowerCase().includes(q) ||
        (c.continent?.toLowerCase().includes(q) ?? false) ||
        (c.sub_region?.toLowerCase().includes(q) ?? false)
    )
  }, [countries, search])

  return (
    <ContentPageLayout title={t('moduleCountries')}>
      <div className='space-y-4'>
        <div className='flex items-center justify-between gap-4'>
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchPlaceholderCountries')}
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
                <th className='px-4 py-2 text-left'>{t('colContinent')}</th>
                <th className='px-4 py-2 text-left'>{t('colSubRegion')}</th>
                <th className='px-4 py-2 text-center'>{t('colEnabled')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className='px-4 py-8 text-center text-muted-foreground'>
                    {t('loading')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-4 py-8 text-center text-muted-foreground'>
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.code} className='border-b last:border-0 hover:bg-muted/30'>
                    <td className='px-4 py-2 font-mono'>{c.code}</td>
                    <td className='px-4 py-2'>{c.name_zh}</td>
                    <td className='px-4 py-2 text-muted-foreground'>{c.continent ?? '—'}</td>
                    <td className='px-4 py-2 text-muted-foreground'>{c.sub_region ?? '—'}</td>
                    <td className='px-4 py-2 text-center'>{c.is_active ? '✓' : '—'}</td>
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
