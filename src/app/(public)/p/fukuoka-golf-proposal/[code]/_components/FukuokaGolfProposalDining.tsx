'use client'

/**
 * 福岡高爾夫提案 - 餐食與深度體驗推薦
 * 參考客戶調性：去過金澤、能登、界系列，重視深度體驗
 */

import { motion } from 'framer-motion'

const LUXURY = {
  primary: '#1a4a5e',
  secondary: '#c9aa7c',
  accent: '#8f4f4f',
  background: '#FDFBF7',
}

const restaurants = [
  {
    name: 'しのはら（Shinoihara）',
    type: '溫泉旅館會席',
    location: '由布院',
    priceRange: '¥30,000-50,000/人',
    description: '由布院秘境溫泉旅館，食材皆來自當地農場與牧場，料理細膩如同藝術品。',
    highlight: '就像在界系列用餐的體驗，但更私密、更細緻',
    image: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=600&q=80',
  },
  {
    name: '花村',
    type: '博多傳統料理',
    location: '博多車站附近',
    priceRange: '¥15,000-25,000/人',
    description: '博多在地老舖，專精博多名產：明太子、水炊雞肉鍋、呼子烏賊。',
    highlight: '在地人帶路才知道的私房名店',
    image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&q=80',
  },
  {
    name: '青せい（Ao Sey）',
    type: '法式料理',
    location: 'The Ritz-Carlton Fukuoka',
    priceRange: '¥20,000-35,000/人',
    description: 'Ritz-Carlton 內的法式餐廳，主廚曾在法國米其林三星修業，景觀開闊。',
    highlight: '抵達日晚餐推薦，輕鬆不累',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
  },
  {
    name: '柳川鰻魚屋 うなぎ屋',
    type: '鰻魚飯',
    location: '柳川',
    priceRange: '¥8,000-15,000/人',
    description: '蒸籠鰻魚飯發源地，傳承四代的蒸籠技法，鰻魚軟嫩入味，配上秘傳醬汁。',
    highlight: 'Day 2 太太組午餐推薦',
    image: 'https://images.unsplash.com/photo-1559818097-39b8e7ffc0e0?w=600&q=80',
  },
]

const experiences = [
  {
    name: '太宰府天滿宮',
    type: '文化',
    duration: '1.5-2 小時',
    description: '學問之神供奉地，星巴克太宰府店是世界唯一木製迷宮結構建築。',
    tip: '求一支學業或事業御守，送給孫子女很合適',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80',
  },
  {
    name: '柳川遊船',
    type: '體驗',
    duration: '50 分鐘',
    description: '水都柳川的小船上，聽船夫哼唱民謠，穿過柳樹垂懸的水道。',
    tip: '搭配鰻魚飯成完整體驗',
    image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80',
  },
  {
    name: '由布院甜點之旅',
    type: '美食',
    duration: '2-3 小時',
    description: '金麟湖畔的童話小鎮，SNOOPY 茶屋、YURI 布丁、B-SPEAK 瑞士捲。',
    tip: '早起趁遊客少時前往，享受晨霧中的金麟湖',
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=80',
  },
  {
    name: 'Ritz-Carlton Spa',
    type: 'SPA',
    duration: '60-90 分鐘',
    description: '使用日本本地素材的山茶花油、抹茶精华，舒壓按摩或臉部護理。',
    tip: 'Day 3 太太 SPA 日重點行程',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80',
  },
  {
    name: '糸島職人手作體驗',
    type: '手作',
    duration: '2 小時',
    description: '在糸島半島參加陶藝、染布或木工體驗，製作獨一無二的作品帶回家。',
    tip: '可預約老師到球場附近的工房',
    image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=600&q=80',
  },
  {
    name: '金麟湖晨霧',
    type: '自然',
    duration: '1 小時',
    description: '清晨時分，金麟湖畔被晨霧籠罩，如同仙境，是 SNS 打卡聖地。',
    tip: 'Day 4 太太組早起行程',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  },
]

const shops = [
  {
    name: '岩田屋デパート',
    location: '博多車站',
    type: '百貨',
    description: '福岡最頂級的百貨公司，匯集國際精品與日本在地設計師品牌。',
  },
  {
    name: 'Canal City 運河城',
    location: '博多車站附近',
    type: '購物中心',
    description: '結合水岸造景的複合商場，有無印良品、ABC-MART 等，品牌齊全。',
  },
  {
    name: 'MARK IS 福岡ももち',
    location: '百道海灘',
    type: '購物中心',
    description: '海邊的購物商場，設有超市與生活用品，逛街之餘可看海景。',
  },
  {
    name: 'MILCHEL みくichel',
    location: '天神',
    type: '選物店',
    description: '結合咖啡與選物的複合店，網羅日本各地職人設計的生活用品。',
  },
]

export function FukuokaGolfProposalDining() {
  return (
    <section className="space-y-20">
      {/* 標題 */}
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
          Dining & Experience
        </span>
        <h2 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
          深度餐食與體驗
        </h2>
        <p className="text-muted-foreground text-base">
          為懂得品味的人，精選每一餐
        </p>
      </motion.div>

      {/* 餐廳推薦 */}
      <div>
        <motion.div
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${LUXURY.secondary}15` }}
          >
            <span className="text-2xl">🍽️</span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: LUXURY.secondary }}>
              Restaurant Selection
            </span>
            <h3 className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              餐廳推薦
            </h3>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {restaurants.map((restaurant, index) => (
            <motion.div
              key={restaurant.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="group overflow-hidden rounded-2xl border bg-card"
              style={{
                borderColor: 'rgba(201,170,124,0.15)',
              }}
            >
              <div className="grid lg:grid-cols-5">
                {/* 圖片 */}
                <div className="lg:col-span-2 relative h-48 lg:h-auto overflow-hidden">
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                </div>

                {/* 內容 */}
                <div className="lg:col-span-3 p-6 flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${LUXURY.secondary}15`,
                          color: LUXURY.secondary,
                        }}
                      >
                        {restaurant.type}
                      </span>
                      <h4 className="text-lg font-bold mt-2" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                        {restaurant.name}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        📍 {restaurant.location}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {restaurant.description}
                      </p>
                    </div>
                  </div>

                  {/* 亮點標籤 */}
                  <div className="mt-4">
                    <p className="text-sm font-medium" style={{ color: LUXURY.accent }}>
                      ✨ {restaurant.highlight}
                    </p>
                    <p className="text-sm font-bold mt-2" style={{ color: LUXURY.secondary }}>
                      {restaurant.priceRange}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 體驗推薦 */}
      <div>
        <motion.div
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${LUXURY.accent}15` }}
          >
            <span className="text-2xl">🎯</span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: LUXURY.accent }}>
              Experience Selection
            </span>
            <h3 className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              深度體驗推薦
            </h3>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiences.map((exp, index) => (
            <motion.div
              key={exp.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="group overflow-hidden rounded-2xl border bg-card"
              style={{
                borderColor: 'rgba(201,170,124,0.15)',
              }}
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={exp.image}
                  alt={exp.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      color: '#1a4a5e',
                    }}
                  >
                    {exp.type}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <h4 className="text-lg font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                  {exp.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  ⏱ {exp.duration}
                </p>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  {exp.description}
                </p>
                <p className="text-sm mt-3 p-3 rounded-lg" style={{ backgroundColor: `${LUXURY.secondary}10` }}>
                  💡 {exp.tip}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 店家推薦 */}
      <div>
        <motion.div
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${LUXURY.primary}15` }}
          >
            <span className="text-2xl">🛍️</span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: LUXURY.primary }}>
              Shopping Guide
            </span>
            <h3 className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              太太逛街指南
            </h3>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {shops.map((shop, index) => (
            <motion.div
              key={shop.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="p-5 rounded-xl border"
              style={{
                backgroundColor: `${LUXURY.primary}05`,
                borderColor: `${LUXURY.primary}15`,
              }}
            >
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${LUXURY.primary}15`,
                  color: LUXURY.primary,
                }}
              >
                {shop.type}
              </span>
              <h4 className="text-base font-bold mt-3" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                {shop.name}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                📍 {shop.location}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {shop.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 參考客戶調性 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-2xl p-8 border"
        style={{
          backgroundColor: `${LUXURY.secondary}05`,
          borderColor: `${LUXURY.secondary}20`,
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${LUXURY.secondary}15` }}
          >
            <span className="text-2xl">💎</span>
          </div>
          <div>
            <h4 className="text-lg font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              為什麼我們這樣安排
            </h4>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              根據您提到去過金澤、能登、界系列的經驗，這次福岡行程我們特別安排：
            </p>
            <ul className="mt-3 space-y-2">
              {[
                '由布院秘境溫泉旅館（類似界的規格，但更小眾）',
                '太太深度文化日（太宰府、柳川、職人體驗）',
                '由布院甜點之旅（類似金澤東茶屋街的悠閒氛圍）',
                '第三晚換宿的驚喜感（每次換宿都是新旅程的開始）',
                'Day 4 先生在飯店享設施、太太自由探索（各自定義假期的樣子）',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span style={{ color: LUXURY.secondary }}>✓</span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
