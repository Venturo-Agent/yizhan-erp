import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { createApiClient, getCurrentWorkspaceIdServer } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { createContractSchema } from '@/lib/validations/api-schemas'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'

// 自動判斷合約類型 — 從 country_id 解析出國家名，台灣 = 國內團
async function getContractTemplate(
  supabase: Awaited<ReturnType<typeof createApiClient>>,
  countryId: string | null | undefined
): Promise<string> {
  if (!countryId) return 'international'
  const { data } = await supabase.from('countries').select('name').eq('id', countryId).single()
  return data?.name === '台灣' ? 'domestic' : 'international'
}

// 產生合約編號
function generateContractCode(tourCode: string): string {
  const suffix = nanoid(6).toUpperCase()
  return `${tourCode}-C${suffix}`
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.TOURS_CONTRACT_WRITE)
    if (!guard.ok) return guard.response
    const supabase = await createApiClient()
    const workspaceId = await getCurrentWorkspaceIdServer()

    if (!workspaceId) {
      return NextResponse.json({ error: '未登入或無法取得租戶' }, { status: 401 })
    }

    await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '建立合約' })

    const validation = await validateBody(request, createContractSchema)
    if (!validation.success) return validation.error
    const {
      orderId,
      memberIds: rawMemberIds,
      signerType,
      signerName,
      signerIdNumber,
      signerPhone,
      signerAddress,
      companyName,
      companyTaxId,
      companyRepresentative,
      companyAddress,
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
      contractData,
      createdBy,
      includeMemberList,
      includeItinerary,
    } = validation.data

    // 從 orderId 取得 tour_id（schema 的 tourId 已改為由後端從 order 推導）
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('tour_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order?.tour_id) {
      return NextResponse.json({ error: '找不到訂單或訂單無對應旅遊團' }, { status: 404 })
    }

    const tourId = order.tour_id

    // 取得團資訊（RLS 會自動過濾）
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('id, code, name, country_id, airport_code, departure_date, return_date')
      .eq('id', tourId)
      .single()

    if (tourError || !tour) {
      return NextResponse.json({ error: '找不到旅遊團' }, { status: 404 })
    }

    // memberIds：未傳時自動帶該訂單全部團員 id
    let memberIds: string[] = rawMemberIds ?? []
    if (memberIds.length === 0) {
      const { data: allMembers } = await supabase
        .from('order_members')
        .select('id')
        .eq('order_id', orderId)
      memberIds = allMembers?.map(m => m.id) ?? []
    }

    // 取得第一個團員的資訊（作為簽約人）
    const { data: members } = await supabase
      .from('order_members')
      .select('id, chinese_name, id_number')
      .in('id', memberIds)
      .limit(1)

    const firstMember = members?.[0]

    // 產生合約編號和類型
    const contractCode = generateContractCode(tour.code)
    const template = await getContractTemplate(supabase, tour.country_id)

    // 解析目的地顯示字串（airport_code → 城市名 → 國家名 → 機場代碼）
    let tourDestinationDisplay = ''
    if (tour.airport_code) {
      const { data: airport } = await supabase
        .from('ref_airports')
        .select('city_name_zh')
        .eq('iata_code', tour.airport_code)
        .maybeSingle()
      tourDestinationDisplay = airport?.city_name_zh || ''
    }
    if (!tourDestinationDisplay && tour.country_id) {
      const { data: country } = await supabase
        .from('countries')
        .select('name')
        .eq('id', tour.country_id)
        .maybeSingle()
      tourDestinationDisplay = country?.name || ''
    }
    if (!tourDestinationDisplay) {
      tourDestinationDisplay = tour.airport_code || ''
    }

    // 組合 contract_data（合約變數）
    const today = new Date()
    const departureDate = tour.departure_date ? new Date(tour.departure_date) : today

    // 計算旅客名稱（多人時加「等 N 人」）
    const baseTravelerName = signerName || firstMember?.chinese_name || ''
    const travelerNameWithCount =
      memberIds.length > 1 ? `${baseTravelerName} 等 ${memberIds.length} 人` : baseTravelerName

    const generatedContractData = {
      // 審閱日期（今天）
      reviewYear: (today.getFullYear() - 1911).toString(),
      reviewMonth: (today.getMonth() + 1).toString(),
      reviewDay: today.getDate().toString(),

      // 旅客資訊
      travelerName: travelerNameWithCount,
      travelerIdNumber: signerIdNumber || firstMember?.id_number || '',
      travelerPhone: signerPhone || '',
      travelerAddress: signerAddress || '',

      // 緊急聯絡人
      emergencyContactName: emergencyContactName || '',
      emergencyContactRelation: emergencyContactRelation || '',
      emergencyContactPhone: emergencyContactPhone || '',

      // 旅遊團資訊
      tourName: tour.name || '',
      tourDestination: tourDestinationDisplay,
      tourCode: tour.code || '',

      // 集合資訊（出發日期）
      gatherYear: (departureDate.getFullYear() - 1911).toString(),
      gatherMonth: (departureDate.getMonth() + 1).toString(),
      gatherDay: departureDate.getDate().toString(),
      gatherHour: '06',
      gatherMinute: '00',
      gatherLocation: '桃園國際機場第一航廈',

      // 費用資訊（需從訂單取得）
      totalAmount: '0',
      depositAmount: '0',
      paymentMethod: '匯款',
      finalPaymentMethod: '匯款',

      // 保險
      deathInsurance: '500萬',
      medicalInsurance: '20萬',

      // 其他
      minParticipants: '16',
      companyExtension: '',

      // 合併傳入的 contractData
      ...contractData,
    }

    const { data: contract, error: createError } = await supabase
      .from('contracts')
      .insert({
        workspace_id: workspaceId,
        tour_id: tourId,
        order_id: orderId,
        code: contractCode,
        template,
        signer_type: signerType,
        signer_name: signerName,
        signer_id_number: signerIdNumber,
        signer_phone: signerPhone,
        signer_address: signerAddress,
        company_name: companyName,
        company_tax_id: companyTaxId,
        company_representative: companyRepresentative,
        company_address: companyAddress,
        emergency_contact_name: emergencyContactName,
        emergency_contact_relation: emergencyContactRelation,
        emergency_contact_phone: emergencyContactPhone,
        member_ids: memberIds,
        contract_data: generatedContractData,
        status: 'draft',
        created_by: createdBy,
        // 附件選項
        include_member_list: includeMemberList,
        include_itinerary: includeItinerary,
      })
      .select()
      .single()

    if (createError) {
      logger.error('Create contract error:', createError)
      const t = translateDbError(createError)
      return NextResponse.json(
        { error: t.message, code: t.code, field: t.field },
        { status: t.httpStatus }
      )
    }

    // 更新團員的 contract_id
    await supabase.from('order_members').update({ contract_id: contract.id }).in('id', memberIds)

    // 產生簽約連結
    const signUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://erp.venturo.tw'}/public/contract/sign/${contractCode}`

    return NextResponse.json({
      success: true,
      contract: {
        ...contract,
        signUrl,
      },
    })
  } catch (err) {
    logger.error('Create contract uncaught:', err)
    const t = translateDbError(err)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
}
