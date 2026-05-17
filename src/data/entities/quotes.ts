'use client'

/**
 * Quotes Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Quote } from '@/stores/types'

const quoteEntity = createEntityHook<Quote>('quotes', {
  list: {
    // 2026-05-15 補 version / versions / current_version_index / confirmed_version / country_code（雙軌版本系統）
    select:
      'id,code,customer_name,customer_phone,customer_email,destination,start_date,end_date,days,nights,adult_count,child_count,infant_count,total_amount,status,valid_until,notes,created_at,updated_at,name,group_size,accommodation_days,version,versions,current_version_index,confirmed_version,created_by,created_by_name,converted_to_tour,tour_id,categories,is_active,number_of_people,customer_id,participant_counts,selling_prices,total_cost,is_pinned,country_id,country_code,airport_code,other_city_ids,quote_type,contact_phone,contact_address,tour_code,handler_name,issue_date,received_amount,balance_amount,quick_quote_items,workspace_id,shared_with_workspaces,updated_by,itinerary_id,expense_description,tier_pricings,confirmation_status,confirmation_token,confirmation_token_expires_at,confirmed_at,confirmed_by_type,confirmed_by_name,confirmed_by_email,confirmed_by_phone,confirmed_by_staff_id,confirmation_ip,confirmation_user_agent,confirmation_notes,cost_structure,profit_margin,confirmed_by,customer_confirmed_at,display_price,is_locked,locked_at,locked_by,overall_margin_percent',
    orderBy: { column: 'created_at', ascending: false },
    filterSoftDeleted: true,
  },
  slim: {
    select: 'id,tour_id,name,total_cost,group_size',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useQuotes = quoteEntity.useList
export const useQuotesSlim = quoteEntity.useListSlim
export const useQuote = quoteEntity.useDetail
const _useQuotesPaginated = quoteEntity.usePaginated
const _useQuoteDictionary = quoteEntity.useDictionary

export const createQuote = quoteEntity.create
export const updateQuote = quoteEntity.update
export const deleteQuote = quoteEntity.delete
export const invalidateQuotes = quoteEntity.invalidate
