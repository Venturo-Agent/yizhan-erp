'use client'

/**
 * 福岡高爾夫提案 - 餐食與深度體驗推薦（Editorial Magazine 版）
 * 無 emoji · 襯線字體 · 雜誌排版
 */

import { motion } from 'framer-motion'

export function FukuokaGolfProposalDining() {
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
      name: '青せい（Ao Sey）',
      type: '法式料理',
      location: 'The Ritz-Carlton Fukuoka',
      priceRange: '¥20,000-35,000/人',
      description: 'Ritz-Carlton 內的法式餐廳，主廚曾在法國米其林三星修業，景觀開闊。',
      highlight: '抵達日晚餐推薦，輕鬆不累',
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    },
    {
      name: '柳川鰻魚屋',
      type: '鰻魚飯',
      location: '柳川',
      priceRange: '¥8,000-15,000/人',
      description: '蒸籠鰻魚飯發源地，傳承四代的蒸籠技法，鰻魚軟嫩入味，配上秘傳醬汁。',
      highlight: 'Day 2 太太組午餐推薦',
      image: 'https://images.unsplash.com/photo-1559818097-39b8e7ffc0e0?w=600&q=80',
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
      description: '使用日本本地素材的山茶花油、抹茶精華，舒壓按摩或臉部護理。',
      tip: 'Day 3 太太 SPA 日重點行程',
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80',
    },
    {
      name: '金麟湖晨霧',
      type: '自然',
      duration: '1 小時',
      description: '清晨時分，金麟湖畔被晨霧籠罩，如同仙境，是 SNS 打卡聖地。',
      tip: 'Day 4 太太組早起行程',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    },
    {
      name: '糸島職人手作',
      type: '手作',
      duration: '2 小時',
      description: '在糸島半島參加陶藝、染布或木工體驗，製作獨一無二的作品帶回家。',
      tip: '可預約老師到球場附近的工房',
      image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=600&q=80',
    },
  ]

  return (
    <section className="py-32" style={{ backgroundColor: '#FAF8F5' }}>
      <div className="max-w-6xl mx-auto px-8 lg:px-16">
        {/* 標題 */}
        <motion.div
          className="mb-24"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span
            className="text-xs tracking-[0.3em] uppercase block mb-4"
            style={{ fontFamily: 'system-ui', color: '#8B7355' }}
          >
            Dining & Experience
          </span>
          <h2 className="text-5xl lg:text-6xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            深度餐食與體驗
          </h2>
          <p className="text-lg mt-4" style={{ color: '#666' }}>
            為懂得品味的人，精選每一餐
          </p>
        </motion.div>

        {/* 餐廳推薦 */}
        <div className="mb-32">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-1 h-8" style={{ backgroundColor: '#8B7355' }} />
            <h3 className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              餐廳推薦
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {restaurants.map((restaurant, index) => (
              <motion.div
                key={restaurant.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="border"
                style={{ borderColor: '#E5E5E5', backgroundColor: '#fff' }}
              >
                <div className="grid lg:grid-cols-5">
                  {/* 圖片 */}
                  <div className="lg:col-span-2 relative" style={{ minHeight: '200px' }}>
                    <img
                      src={restaurant.image}
                      alt={restaurant.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>

                  {/* 內容 */}
                  <div className="lg:col-span-3 p-8">
                    <span
                      className="text-xs tracking-[0.15em] uppercase"
                      style={{ fontFamily: 'system-ui', color: '#8B7355' }}
                    >
                      {restaurant.type}
                    </span>
                    <h4 className="text-xl font-bold mt-2 mb-1" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                      {restaurant.name}
                    </h4>
                    <p className="text-sm mb-4" style={{ color: '#666' }}>{restaurant.location}</p>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: '#444' }}>
                      {restaurant.description}
                    </p>
                    <p className="text-sm mb-2" style={{ color: '#8B7355' }}>
                      {restaurant.highlight}
                    </p>
                    <p className="text-base font-bold" style={{ color: '#8B7355', fontFamily: 'Noto Serif TC, serif' }}>
                      {restaurant.priceRange}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 體驗推薦 */}
        <div className="mb-32">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-1 h-8" style={{ backgroundColor: '#6B7B8B' }} />
            <h3 className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              深度體驗推薦
            </h3>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {experiences.map((exp, index) => (
              <motion.div
                key={exp.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="border"
                style={{ borderColor: '#E5E5E5', backgroundColor: '#fff' }}
              >
                <div className="relative" style={{ minHeight: '200px' }}>
                  <img
                    src={exp.image}
                    alt={exp.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4">
                    <span
                      className="text-xs px-3 py-1"
                      style={{ backgroundColor: '#fff', color: '#1a1a1a', fontFamily: 'system-ui' }}
                    >
                      {exp.type}
                    </span>
                  </div>
                </div>

                <div className="p-8">
                  <h4 className="text-lg font-bold mb-2" style={{ fontFamily: 'Noto Serif TC, serif' }}>
                    {exp.name}
                  </h4>
                  <p className="text-xs mb-4" style={{ color: '#999', fontFamily: 'system-ui' }}>
                    {exp.duration}
                  </p>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#444' }}>
                    {exp.description}
                  </p>
                  <p
                    className="text-sm p-4"
                    style={{ backgroundColor: 'rgba(139,115,85,0.08)', color: '#666' }}
                  >
                    {exp.tip}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 為什麼這樣安排 */}
        <motion.div
          className="p-12 border-l-4"
          style={{ borderColor: '#8B7355', backgroundColor: '#fff' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h4 className="text-xl font-bold mb-6" style={{ fontFamily: 'Noto Serif TC, serif' }}>
            為什麼我們這樣安排
          </h4>
          <p className="text-base mb-6 leading-relaxed" style={{ color: '#666' }}>
            根據您提到去過金澤、能登、界系列的經驗，這次福岡行程我們特別安排：
          </p>
          <ul className="space-y-3">
            {[
              '由布院秘境溫泉旅館（類似界的規格，但更小眾）',
              '太太深度文化日（太宰府、柳川、職人體驗）',
              '由布院甜點之旅（類似金澤東茶屋街的悠閒氛圍）',
              '第三晚換宿的驚喜感（每次換宿都是新旅程的開始）',
              'Day 4 先生在飯店享設施、太太自由探索（各自定義假期的樣子）',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-base" style={{ color: '#444' }}>
                <span className="flex-shrink-0 w-1 h-1 mt-2" style={{ backgroundColor: '#8B7355' }} />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}
