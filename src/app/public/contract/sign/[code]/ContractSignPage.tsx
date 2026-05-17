'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { getPreviewDailyData } from '@/app/(main)/tours/_components/itinerary-editor/format-itinerary'
import { ContractPreviewStep } from './ContractPreviewStep'
import { ContractFillInfoStep } from './ContractFillInfoStep'
import { ContractSignStep } from './ContractSignStep'
import { ContractSuccessStep } from './ContractSuccessStep'
import { loadContractTemplate, printContract } from './contract-sign-helpers'
import { apiMutate } from '@/lib/swr/api-mutate'

interface ContractMember {
  id: string
  chinese_name: string | null
  id_number: string | null
  birth_date: string | null
}

interface Contract {
  id: string
  code: string
  template: string
  signer_type: string
  signer_name: string
  company_name?: string
  member_ids: string[]
  contract_data: Record<string, unknown>
  status: string
  signer_phone?: string | null
  signer_address?: string | null
  signer_id_number?: string | null
  signature_image?: string | null
  signed_at?: string | null
  include_member_list?: boolean
  include_itinerary?: boolean
  tours: {
    id: string
    code: string
    name: string
    location: string
    departure_date: string
    return_date: string
  }
  workspaces: {
    id: string
    name: string
  }
  members: ContractMember[]
  itineraryData: {
    daily_itinerary: unknown
    departure_date: string | null
    outbound_flight: unknown
    return_flight: unknown
  } | null
  itineraryDepartureDate: string | null
}

interface ContractSignPageProps {
  contract: Contract
}

const TEMPLATE_FILES: Record<string, string> = {
  domestic: 'domestic.html',
  international: 'international.html',
  individual_international: 'individual_international_full.html',
}

const TEMPLATE_LABELS: Record<string, string> = {
  domestic: '國內旅遊定型化契約',
  international: '國外旅遊定型化契約',
  individual_international: '國外個別旅遊定型化契約',
}

export function ContractSignPage({ contract }: ContractSignPageProps) {
  const isSigned = contract.status === 'signed'
  const [step, setStep] = useState<'preview' | 'fill-info' | 'sign' | 'success'>('preview')

  // 簽約人補填資訊
  const [signerPhone, setSignerPhone] = useState(contract.signer_phone || '')
  const [signerAddress, setSignerAddress] = useState(contract.signer_address || '')
  const [signerIdNumber, setSignerIdNumber] = useState(contract.signer_id_number || '')
  const [contractHtml, setContractHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [canSign, setCanSign] = useState(isSigned)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signatureWidth, setSignatureWidth] = useState(350)
  const [readingProgress, setReadingProgress] = useState(isSigned ? 100 : 0)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)
  const [savedSignature, setSavedSignature] = useState<string | null>(
    contract.signature_image || null
  )

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 行程預覽資料（跟報價單用同一個 formatter）
  const dailyData = useMemo(() => {
    const itin = contract.itineraryData
    if (!itin?.daily_itinerary) return []
    const daily = itin.daily_itinerary as Array<{
      day: number
      route?: string
      title?: string
      meals?: { breakfast?: string; lunch?: string; dinner?: string }
      accommodation?: string
      sameAsPrevious?: boolean
      hotelBreakfast?: boolean
      lunchSelf?: boolean
      dinnerSelf?: boolean
      note?: string
      description?: string
    }>
    const schedule = daily.map((d, i) => ({
      day: d.day || i + 1,
      route: d.route || d.title || '',
      meals: {
        breakfast: d.meals?.breakfast || '',
        lunch: d.meals?.lunch || '',
        dinner: d.meals?.dinner || '',
      },
      accommodation: d.accommodation || '',
      sameAsPrevious: d.sameAsPrevious || false,
      hotelBreakfast: d.hotelBreakfast || false,
      lunchSelf: d.lunchSelf || false,
      dinnerSelf: d.dinnerSelf || false,
      note: d.note || d.description || undefined,
    }))
    return getPreviewDailyData(
      schedule,
      contract.itineraryDepartureDate || itin.departure_date || null
    )
  }, [contract.itineraryData, contract.itineraryDepartureDate])

  // 計算響應式簽名板寬度
  useEffect(() => {
    const updateWidth = () => {
      const width = Math.min(350, window.innerWidth - 96)
      setSignatureWidth(width)
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // 載入合約範本
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const templateFile = TEMPLATE_FILES[contract.template] || 'international.html'
        const html = await loadContractTemplate({
          templateFile,
          contractData: contract.contract_data || {},
          signerType: contract.signer_type,
          signerName: contract.signer_name,
          companyName: contract.company_name,
          memberIds: contract.member_ids,
        })
        setContractHtml(html)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [contract])

  // 監聽滾動，滾到底部才能簽名
  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const progress = Math.min((scrollTop / (scrollHeight - clientHeight)) * 100, 100)
    setReadingProgress(progress)
    if (scrollTop + clientHeight >= scrollHeight - 50 && !canSign) {
      setCanSign(true)
    }
  }

  const handleSignatureCapture = (signatureDataUrl: string) => {
    setSignaturePreview(signatureDataUrl)
  }

  const handleRetrySign = () => {
    setSignaturePreview(null)
    setError(null)
  }

  const handlePrint = useCallback(() => {
    printContract({
      contractHtml,
      tourName: contract.tours.name,
      contractCode: contract.code,
      signerAddress,
      signerIdNumber,
      signerPhone,
      savedSignature,
      includeMemberList: contract.include_member_list,
      includeItinerary: contract.include_itinerary,
      members: contract.members,
      dailyData,
    })
  }, [contractHtml, contract, signerAddress, signerIdNumber, signerPhone, savedSignature, dailyData])

  const handleConfirmSign = async () => {
    if (!signaturePreview) {
      setError('請先簽名')
      return
    }
    setSigning(true)
    setError(null)
    try {
      const res = await apiMutate('/api/contracts/sign', {
        method: 'POST',
        body: {
          contractId: contract.id,
          signature: signaturePreview,
          signerPhone: signerPhone.trim(),
          signerAddress: signerAddress.trim(),
          signerIdNumber: signerIdNumber.trim() || undefined,
        },
      })
      if (!res.ok) throw new Error(res.error || '簽署失敗')
      setSavedSignature(signaturePreview)
      setStep('preview')
      setCanSign(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSigning(false)
    }
  }

  const templateLabel = TEMPLATE_LABELS[contract.template] || '旅遊合約'

  if (step === 'preview') {
    return (
      <ContractPreviewStep
        templateLabel={templateLabel}
        tourName={contract.tours.name}
        contractCode={contract.code}
        workspaceName={contract.workspaces.name}
        savedSignature={savedSignature}
        isSigned={isSigned}
        signedAt={contract.signed_at}
        loading={loading}
        error={error}
        contractHtml={contractHtml}
        readingProgress={readingProgress}
        canSign={canSign}
        signerAddress={signerAddress}
        signerIdNumber={signerIdNumber}
        signerPhone={signerPhone}
        includeMemberList={contract.include_member_list}
        includeItinerary={contract.include_itinerary}
        members={contract.members}
        dailyData={dailyData}
        scrollContainerRef={scrollContainerRef}
        onScroll={handleScroll}
        onProceedToSign={() => setStep('fill-info')}
        onPrint={handlePrint}
      />
    )
  }

  if (step === 'fill-info') {
    return (
      <ContractFillInfoStep
        templateLabel={templateLabel}
        tourName={contract.tours.name}
        signerName={contract.signer_name}
        memberCount={contract.member_ids?.length ?? 1}
        signerPhone={signerPhone}
        signerAddress={signerAddress}
        signerIdNumber={signerIdNumber}
        error={error}
        onPhoneChange={setSignerPhone}
        onAddressChange={setSignerAddress}
        onIdNumberChange={setSignerIdNumber}
        onBack={() => setStep('preview')}
        onNext={() => {
          if (!signerPhone.trim()) { setError('請輸入聯絡電話'); return }
          if (!signerAddress.trim()) { setError('請輸入地址'); return }
          setError(null)
          setStep('sign')
        }}
      />
    )
  }

  if (step === 'sign') {
    return (
      <ContractSignStep
        templateLabel={templateLabel}
        tourName={contract.tours.name}
        signerName={contract.signer_name}
        companyName={contract.company_name}
        signerType={contract.signer_type}
        memberCount={contract.member_ids?.length ?? 1}
        signatureWidth={signatureWidth}
        signing={signing}
        signaturePreview={signaturePreview}
        error={error}
        onBack={() => setStep('preview')}
        onSignatureCapture={handleSignatureCapture}
        onRetrySign={handleRetrySign}
        onConfirmSign={handleConfirmSign}
      />
    )
  }

  if (step === 'success') {
    return (
      <ContractSuccessStep
        contractCode={contract.code}
        onBackToHome={() => (window.location.href = '/')}
        onViewContract={() => setStep('preview')}
      />
    )
  }

  return null
}
