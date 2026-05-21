'use client'

/**
 * 蘇梅島提案 - 費用說明（Luxury Accordion 版）
 * 設計參考：TourPricingSectionLuxury.tsx + Accordion motion
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const LUXURY = {
  primary: '#2C5F4D',
  secondary: '#C69C6D',
  accent: '#8F4F4F',
  background: '#FDFBF7',
}

const pricingDetails = {
  flight: {
    label: '來回機票',
    pricePerPerson: 24000,
    unit: '每人',
    quantity: 14,
    total: 336000,
    note: '曼谷航空（TPE ↔ BKK）+ 蘇梅島航班（BKK ↔ USM）',
  },
  sheraton: {
    label: 'Sheraton Samui Resort',
    pricePerRoom: 14000,
    unit: '每晚每間',
    nights: 2,
    rooms: 7,
    total: 98000,
    note: 'Day 1-2 入住，共 7 間房（2人一間）',
  },
  sala: {
    label: 'Sala Samui Choengmon Beach',
    pricePerRoom: 42000,
    unit: '每晚每間',
    nights: 3,
    rooms: 7,
    total: 294000,
    note: 'Day 3-5 入住，共 7 間房（2人一間）',
  },
  van: {
    label: '包車服務',
    pricePerDay: 10000,
    unit: '每天',
    days: 4,
    total: 40000,
    note: 'Day 1 接機、Day 2 遊艇、Day 3 文化探索、Day 6 送機',
  },
}

const groupMeals = {
  label: '團體晚餐',
  pricePerPerson: 2000,
  unit: '每人每晚',
  nights: 3,
  total: 84000,
  note: 'Day 1、2、3 晚餐（14人 × 3晚 × 2,000฿）',
}

const optionalActivities = [
  { name: '安通國家公園', price: '1,500-2,000', unit: '฿/人', description: '含長尾船、划Kayak、登頂看瀉湖，包午餐' },
  { name: '日落風帆巡航', price: '2,500-3,500', unit: '฿/人', description: '傍晚出海，觀賞蘇梅島夕陽，含飲料' },
  { name: '叢林騎象', price: '1,200-1,500', unit: '฿/人', description: '象背上逛熱帶雨林，專業教練帶領' },
  { name: '泰式烹飪課程', price: '800-1,000', unit: '฿/人', description: '學做3-4道泰國菜，含午餐' },
  { name: 'Spa 套餐', price: '2,500-4,000', unit: '฿/人', description: '半天或一天泰式按摩套餐' },
]

function AccordionItem({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <motion.div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: isOpen ? LUXURY.secondary : 'rgba(201,170,124,0.15)',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-6 transition-colors"
        style={{
          backgroundColor: isOpen ? `${LUXURY.secondary}08` : 'transparent',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
            style={{
              backgroundColor: `${LUXURY.secondary}15`,
              color: LUXURY.secondary,
            }}
          >
            {icon}
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            {title}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${LUXURY.secondary}15` }}
        >
          <ChevronDown className="w-5 h-5" style={{ color: LUXURY.secondary }} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 border-t" style={{ borderColor: `${LUXURY.secondary}15` }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function TourProposalPricing() {
  const baseTotal =
    pricingDetails.flight.total +
    pricingDetails.sheraton.total +
    pricingDetails.sala.total +
    pricingDetails.van.total +
    groupMeals.total

  const perPersonBase = Math.round(baseTotal / 14)

  return (
    <section className="space-y-20">
      <motion.div
        className="text-center space-y-3"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: LUXURY.secondary, fontFamily: 'Noto Serif TC, serif' }}
        >
          Pricing
        </span>
        <h2 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
          費用說明
        </h2>
        <p className="text-muted-foreground text-base">透明定價，無隱藏費用</p>
      </motion.div>

      {/* 基礎費用 Accordion */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="space-y-4"
      >
        <AccordionItem title="機票" icon="✈️" defaultOpen={true}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">14人來回機票</p>
              <p className="text-xs text-muted-foreground">{pricingDetails.flight.note}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: LUXURY.secondary }}>
                ${pricingDetails.flight.total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">24,000฿ × 14人</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem title="飯店 Day 1-2" icon="🏨">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sheraton Samui Resort</p>
              <p className="text-xs text-muted-foreground">{pricingDetails.sheraton.note}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: LUXURY.secondary }}>
                ${pricingDetails.sheraton.total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">14,000฿ × 7間 × 2晚</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem title="飯店 Day 3-5" icon="🏨">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sala Samui Choengmon Beach</p>
              <p className="text-xs text-muted-foreground">{pricingDetails.sala.note}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: LUXURY.secondary }}>
                ${pricingDetails.sala.total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">42,000฿ × 7間 × 3晚</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem title="包車服務" icon="🚐">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">14人座小巴</p>
              <p className="text-xs text-muted-foreground">{pricingDetails.van.note}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: LUXURY.secondary }}>
                ${pricingDetails.van.total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">10,000฿ × 4天</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem title="團體晚餐" icon="🍽️">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Day 1、2、3 晚餐</p>
              <p className="text-xs text-muted-foreground">{groupMeals.note}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: LUXURY.secondary }}>
                ${groupMeals.total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">2,000฿ × 14人 × 3晚</p>
            </div>
          </div>
        </AccordionItem>
      </motion.div>

      {/* 總計卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="rounded-2xl p-8 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, #1a4a5e 0%, #2d6a7a 100%)`,
        }}
      >
        {/* 裝飾背景 */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: '#c9aa7c' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: '#c9aa7c' }} />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <span className="text-sm font-bold tracking-widest uppercase" style={{ color: 'rgba(201,170,124,0.8)' }}>
              Total
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-white mt-1" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              基礎費用合計
            </h3>
            <p className="text-white/60 text-sm mt-2">不含第四、五天自由活動自費項目</p>
          </div>
          <div className="text-right">
            <p className="text-4xl md:text-5xl font-bold text-white">
              ${baseTotal.toLocaleString()}
            </p>
            <p className="text-lg font-bold mt-2" style={{ color: '#c9aa7c' }}>
              每人約 ${perPersonBase.toLocaleString()} 元
            </p>
          </div>
        </div>
      </motion.div>

      {/* 自費活動 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="bg-card rounded-2xl border p-8"
        style={{ borderColor: 'rgba(201,170,124,0.15)' }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${LUXURY.secondary}15` }}>
            <span className="text-2xl">🎯</span>
          </div>
          <div>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: LUXURY.secondary }}>
              Optional Activities
            </span>
            <h3 className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              自費活動推薦
            </h3>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {optionalActivities.map((activity, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="p-5 rounded-xl border transition-all duration-300 hover:shadow-md"
              style={{
                backgroundColor: `${LUXURY.secondary}05`,
                borderColor: `${LUXURY.secondary}15`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-sm font-bold">{activity.name}</h4>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${LUXURY.secondary}15`, color: LUXURY.secondary }}>
                  自費
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{activity.description}</p>
              <p className="text-xl font-bold" style={{ color: LUXURY.primary }}>
                {activity.price} <span className="text-xs font-normal">{activity.unit}</span>
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl"
          style={{
            backgroundColor: `${LUXURY.secondary}10`,
            border: `1px solid ${LUXURY.secondary}20`,
          }}>
          <p className="text-sm">
            基礎費用約每人 <span className="font-bold" style={{ color: LUXURY.secondary }}>60,857 元</span>，
            加上自費活動每人約 <span className="font-bold" style={{ color: LUXURY.secondary }}>2,500 - 4,000 泰銖</span>，
            預估總費用範圍約 <span className="font-bold" style={{ color: LUXURY.secondary }}>64,500 - 65,000 元</span>。
          </p>
        </div>
      </motion.div>

      {/* 飯店卡片 */}
      <div className="grid md:grid-cols-2 gap-8">
        {[
          {
            name: 'Sheraton Samui Resort',
            location: '蘇梅島西岸海灘第一排',
            nights: '2 晚',
            price: '14,000 ฿',
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
          },
          {
            name: 'Sala Samui Choengmon Beach',
            location: 'Choengmon 海灘區',
            nights: '3 晚',
            price: '42,000 ฿',
            image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80',
          },
        ].map((hotel, i) => (
          <motion.div
            key={hotel.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2, duration: 0.6 }}
            className="group overflow-hidden rounded-2xl border"
            style={{
              borderColor: 'rgba(201,170,124,0.15)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={hotel.image}
                alt={hotel.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                  {hotel.name}
                </h3>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>📍</span>
                <span>{hotel.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>🛏️</span>
                <span>入住 {hotel.nights} · 7 間房（2人一間）</span>
              </div>
              <div className="pt-3 border-t" style={{ borderColor: 'rgba(201,170,124,0.15)' }}>
                <p className="text-sm text-muted-foreground">每晚每間</p>
                <p className="text-2xl font-bold" style={{ color: LUXURY.secondary }}>{hotel.price}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}