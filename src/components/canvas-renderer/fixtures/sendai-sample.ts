/**
 * 仙台範例資料 — 永成款 demo 用
 *
 * 內容對齊 /Users/william/Downloads/tokyo-sendai-private-2026.html
 * 用途：
 * - /p/yongcheng-demo 預覽頁吃這份、讓 William 視覺驗收
 * - Phase 2 自動產生器（從 tour 真實資料生 canvas）有參考 shape
 *
 * 圖片來源：unsplash.com（next.config remotePatterns 已允許）
 */

import type { Canvas } from '../types'

export const sendaiSampleCanvas: Canvas = {
  theme: 'yongcheng',
  brand: {
    name: '角落旅行社',
    english_name: 'Corner Travel',
  },
  sections: [
    // ============ 封面 ============
    {
      type: 'cover',
      data: {
        eyebrow: '2026 私人包團・東京仙台六日',
        title: '走進日本東北、[accent]走你的角落。[/accent]',
        subtitle: '從東京進、仙台出。八人成行、四晚不同主題的頂級旅館、一台專車陪你走完整段。',
        destination: '東京 ✕ 仙台',
        departure_date: '2026.06.12 – 06.17',
        brand: {
          name: '角落旅行社',
          english_name: 'Corner Travel',
        },
        cover_image: {
          url: 'https://images.unsplash.com/photo-1542931287-023b922fa89b?w=1920&q=80',
        },
      },
    },

    // ============ 行程總覽 ============
    {
      type: 'overview_timeline',
      data: {
        days: [
          { day_index: 1, title: '抵達東京', summary: '成田降落、專車直送銀座、晚餐文華東方。' },
          { day_index: 2, title: '日光世遺', summary: '東照宮、中禪寺湖、輪王寺、二荒山神社。' },
          { day_index: 3, title: '會津穿越', summary: '大內宿江戶宿場町、塔のへつり、會津若松。' },
          { day_index: 4, title: '松島群島', summary: '搭船遊松島灣、瑞巖寺、五大堂、海鮮午宴。' },
          { day_index: 5, title: '仙台慢遊', summary: '仙台城跡、青葉通り、伊達政宗夜宴。' },
          { day_index: 6, title: '返程日', summary: '朝市早餐、最後購物、仙台機場送機。' },
        ],
      },
    },

    // ============ Day 1 ============
    {
      type: 'day',
      day_index: 1,
      date: '2026.06.12（五）',
      blocks: [
        {
          id: 'd1-header',
          type: 'day_header',
          data: {
            day_index: 1,
            date: '2026.06.12（星期五）',
            title: '抵達東京、直奔銀座、晚餐文華東方。',
            summary: '中華航空 CI100 桃園直飛、下午抵達成田。專車接機直送銀座、入住東京文華東方酒店。',
          },
        },
        {
          id: 'd1-flight',
          type: 'flight_card',
          data: {
            from_city: 'TPE',
            from_airport: '桃園',
            from_time: '09:30',
            to_city: 'TYO',
            to_airport: '成田',
            to_time: '13:55',
            airline: '中華航空',
            flight_no: 'CI100',
          },
        },
        {
          id: 'd1-hotel',
          type: 'hotel_card',
          data: {
            name: '東京文華東方酒店',
            rating: 5,
            location: '東京・日本橋',
            description: '森林之上、銀座之巔。38 層俯瞰皇居、米其林三星 Signature 餐廳就在腳下。',
            image: {
              url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1600&q=80',
            },
          },
        },
      ],
    },

    // ============ Day 2 ============
    {
      type: 'day',
      day_index: 2,
      date: '2026.06.13（六）',
      blocks: [
        {
          id: 'd2-header',
          type: 'day_header',
          data: {
            day_index: 2,
            date: '2026.06.13（星期六）',
            title: '日光世遺三點一線、午宴湯波懷石。',
            summary: '東照宮、輪王寺、二荒山神社三件套、傍晚回程經中禪寺湖。',
          },
        },
        {
          id: 'd2-routes',
          type: 'route_card',
          layout: '3up',
          data: {
            attractions: [
              {
                id: 'a1',
                name: '日光東照宮',
                subtitle: '世界遺産・德川家康御陵',
                description: '陽明門、唐門、五重塔。三百年江戶幕府的權力象徵。',
                image: {
                  url: 'https://images.unsplash.com/photo-1583843094867-78d68a82dbd0?w=1200&q=80',
                },
                highlights: ['陽明門金箔細工', '見ざる聞かざる言わざる三猿', '眠り猫'],
                suggested_duration: '建議停留 2.5 小時',
                category: '世界遺産',
              },
              {
                id: 'a2',
                name: '輪王寺',
                subtitle: '天台宗大本山',
                description: '德川家光廟、三佛堂、寶物殿。日光山岳信仰的核心。',
                image: {
                  url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80',
                },
                highlights: ['三佛堂木造大佛', '逍遙園日本庭園'],
                suggested_duration: '建議停留 1.5 小時',
                category: '世界遺産',
              },
              {
                id: 'a3',
                name: '中禪寺湖 / 華嚴瀑布',
                subtitle: '日光國立公園',
                description: '海拔 1269m 高山堰塞湖、97m 落差日本三大名瀑。',
                image: {
                  url: 'https://images.unsplash.com/photo-1493780474015-ba834fd0ce2f?w=1200&q=80',
                },
                highlights: ['湖畔遊覧船', '華嚴瀑布電梯下展望台'],
                suggested_duration: '建議停留 2 小時',
                category: '自然景觀',
              },
            ],
          },
        },
        {
          id: 'd2-lunch-spotlight',
          type: 'spotlight',
          data: {
            tag: '— LUNCH · 元祖日光ゆば料理 惠比壽家',
            title: '日光的午餐、[accent]一頓湯波懷石。[/accent]',
            lead:
              '日光名物「湯波（ゆば）」是豆乳煮沸後表面凝結的薄膜、層次細膩、清淡卻甘鮮。\n惠比壽家是日光湯波料理的元祖店、創業逾百年、堅持手工挽湯波。中午一道道送上：刺身湯波、煮物、揚湯波、湯波蕎麥——是日光行程中安靜但有分量的一餐。',
            image: {
              url: 'https://images.unsplash.com/photo-1564843071607-69f1c7c2df56?w=1600&q=80',
            },
            image_position: 'right',
          },
        },
        {
          id: 'd2-note-yuba',
          type: 'jp_note',
          data: {
            term: '湯波（ゆば）',
            description: '日光特產、豆乳加熱後表面凝結的薄膜。',
          },
        },
        {
          id: 'd2-hotel-spotlight',
          type: 'spotlight',
          data: {
            tag: '— STAY · 日光金谷ホテル',
            title: '日本最古老的洋風旅館、[accent]第一晚住進歷史。[/accent]',
            lead:
              '1873 年創業、明治政府開國後第一批面向洋客的西式 resort hotel。\n大谷川旁、東照宮鳥居外、紅瓦白壁洋館。150 年來愛因斯坦、海倫凱勒都住過這。\n第一晚不是泡湯、不是看海、是把客人放進一段日本近代史。',
            image: {
              url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=80',
            },
            image_position: 'left',
          },
        },
        {
          id: 'd2-note-kanaya',
          type: 'jp_note',
          data: {
            term: '日光金谷ホテル',
            description: '日本最古老的西洋式 resort hotel、明治政府指定接待外賓的旅館。',
          },
        },
      ],
    },

    // ============ Day 3 ============
    {
      type: 'day',
      day_index: 3,
      date: '2026.06.14（日）',
      blocks: [
        {
          id: 'd3-header',
          type: 'day_header',
          data: {
            day_index: 3,
            date: '2026.06.14（星期日）',
            title: '穿越大內宿、會津若松城下町。',
            summary: '茅葺屋根的江戶宿場町、紅瓦白壁鶴ヶ城、會津漆器體驗。',
          },
        },
        {
          id: 'd3-routes',
          type: 'route_card',
          layout: '2up',
          data: {
            attractions: [
              {
                id: 'a4',
                name: '大內宿',
                subtitle: '會津西街道・茅葺宿場町',
                description: '江戶時代會津若松⇄日光的驛站、現存 40 餘戶茅葺民家、整條街時間停在 1640 年。',
                image: {
                  url: 'https://images.unsplash.com/photo-1545569310-fd9a86c9bb1a?w=1600&q=80',
                },
                highlights: ['蔥蕎麥（不用筷子用大蔥）', '茅葺屋頂町並', '高台展望所俯瞰全村'],
                suggested_duration: '建議停留 2 小時',
                category: '重要傳統建造物群保存地区',
              },
              {
                id: 'a5',
                name: '會津若松・鶴ヶ城',
                subtitle: '戊辰戰爭的最後堡壘',
                description: '紅瓦白壁、東北唯一紅瓦城。鶴ヶ城公園春櫻、城內博物館看會津武士道。',
                image: {
                  url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1600&q=80',
                },
                highlights: ['天守閣登頂展望', '會津武士道展示', '茶室麟閣抹茶體驗'],
                suggested_duration: '建議停留 2 小時',
                category: '日本 100 名城',
              },
            ],
          },
        },
        {
          id: 'd3-hotel',
          type: 'hotel_card',
          data: {
            name: '東山温泉・原瀧',
            rating: 4,
            location: '會津若松・東山温泉郷',
            description: '會津武士藩主泡過的湯。露天風呂面對東山溪流、一晚兩泡、配懷石料理。',
            image: {
              url: 'https://images.unsplash.com/photo-1578894383290-7d70c7022f4b?w=1600&q=80',
            },
          },
        },
      ],
    },

    // ============ Day 4 ============
    {
      type: 'day',
      day_index: 4,
      date: '2026.06.15（一）',
      blocks: [
        {
          id: 'd4-header',
          type: 'day_header',
          data: {
            day_index: 4,
            date: '2026.06.15（星期一）',
            title: '松島灣遊船、瑞巖寺、五大堂。',
            summary: '日本三景之一、260 座小島散布灣內、海鮮午宴在松島漁港鄰旁的料亭。',
          },
        },
        {
          id: 'd4-seq',
          type: 'sequence_steps',
          data: {
            title: '一日順序 · 建議時程',
            steps: [
              {
                id: 's1',
                time: '09:00',
                title: '出發前往松島',
                description: '從會津若松出發、磐越自動車道接東北自動車道、約 2.5 小時抵達松島海岸。',
              },
              {
                id: 's2',
                time: '11:30',
                title: '松島灣遊船',
                description: '搭乘觀光船 50 分鐘繞行 260 座小島、近距離看仁王島、鐘島、雙子島。',
              },
              {
                id: 's3',
                time: '13:00',
                title: '午餐・松島さかな市場',
                description: '生牡蠣（松島特產）、海鮮丼、星鰻天婦羅。',
              },
              {
                id: 's4',
                time: '15:00',
                title: '瑞巖寺 + 五大堂',
                description: '伊達政宗開創、東北第一禪寺。五大堂面海、跨木橋過去。',
              },
              {
                id: 's5',
                time: '17:30',
                title: '入住仙台',
                description: '專車前往仙台市區、入住威斯汀仙台。',
              },
            ],
          },
        },
        {
          id: 'd4-hotel',
          type: 'hotel_card',
          data: {
            name: '威斯汀仙台',
            rating: 5,
            location: '仙台市・青葉區',
            description: '仙台最高樓 37 層、無敵展望、Westin Heavenly Bed 招牌床。',
            image: {
              url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1600&q=80',
            },
          },
        },
      ],
    },

    // ============ Day 5 ============
    {
      type: 'day',
      day_index: 5,
      date: '2026.06.16（二）',
      blocks: [
        {
          id: 'd5-header',
          type: 'day_header',
          data: {
            day_index: 5,
            date: '2026.06.16（星期二）',
            title: '仙台城跡、青葉通、晚宴伊達。',
            summary: '上午仙台城跡看伊達政宗騎馬像、下午青葉通逛街、晚宴在 100 年老舖。',
          },
        },
        {
          id: 'd5-routes',
          type: 'route_card',
          layout: '3up',
          data: {
            attractions: [
              {
                id: 'a6',
                name: '仙台城跡',
                subtitle: '青葉山・伊達政宗藩邸',
                description: '本丸跡看仙台市區全景、伊達政宗銅像 1935 年立、戰爭時被熔、1964 年重鑄。',
                image: {
                  url: 'https://images.unsplash.com/photo-1493780474015-ba834fd0ce2f?w=1200&q=80',
                },
                highlights: ['伊達政宗騎馬像', '展望廣場看仙台市區', '青葉城資料展示館'],
                suggested_duration: '建議停留 1.5 小時',
              },
              {
                id: 'a7',
                name: '青葉通り',
                subtitle: '仙台の街路樹大道',
                description: '700 棵欅木大道、夏天綠隧道、冬天 SENDAI 光のページェント（光雕祭）。',
                image: {
                  url: 'https://images.unsplash.com/photo-1490604001847-b712b0c2f967?w=1200&q=80',
                },
                highlights: ['一番町商店街購物', '勾當台公園歇腳', '仙台朝市覓食'],
                suggested_duration: '建議停留 2 小時',
              },
              {
                id: 'a8',
                name: '瑞鳳殿',
                subtitle: '伊達政宗御廟',
                description: '桃山樣式靈廟、極彩色木造建築、伊達政宗、忠宗、綱宗三代藩主長眠之地。',
                image: {
                  url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80',
                },
                highlights: ['極彩色靈廟', '伊達武將隊表演（不定期）', '參道杉並木'],
                suggested_duration: '建議停留 1.5 小時',
              },
            ],
          },
        },
        {
          id: 'd5-restaurant',
          type: 'restaurant_card',
          data: {
            meal: 'dinner',
            name: '一の坊 · 伊達の旨み',
            cuisine: '會席料理',
            description: '仙台最具代表的 100 年老舖、伊達家御用菜單、牛舌、毛蟹、三陸生魚片。',
            image: {
              url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1600&q=80',
            },
          },
        },
        {
          id: 'd5-hotel',
          type: 'hotel_card',
          data: {
            name: '威斯汀仙台',
            rating: 5,
            location: '仙台市・青葉區',
            description: '今晚續住一晚、不換房不打包、隔天朝市早餐後直接送機。',
          },
        },
      ],
    },

    // ============ Day 6 ============
    {
      type: 'day',
      day_index: 6,
      date: '2026.06.17（三）',
      blocks: [
        {
          id: 'd6-header',
          type: 'day_header',
          data: {
            day_index: 6,
            date: '2026.06.17（星期三）',
            title: '朝市早餐、最後採購、送機。',
            summary: '清晨仙台朝市看在地人怎麼吃早餐、上午自由購物、下午專車送仙台機場。',
          },
        },
        {
          id: 'd6-seq',
          type: 'sequence_steps',
          data: {
            title: '送機日 · 完整流程',
            steps: [
              {
                id: 'f1',
                time: '07:30',
                title: '仙台朝市早餐',
                description: '海鮮丼、烤牡蠣、現磨豆漿、配在地媽媽桑的笑容。',
              },
              {
                id: 'f2',
                time: '10:00',
                title: '一番町自由購物',
                description: '萩の月、伊達絵巻、牛舌仙貝、最後採購時間 2 小時。',
              },
              {
                id: 'f3',
                time: '13:00',
                title: '專車前往仙台機場',
                description: '車程約 35 分鐘、中華航空 CI173 直飛桃園。',
              },
              {
                id: 'f4',
                time: '14:30',
                title: '機場辦理登機',
                description: '退稅、check-in、海關、登機門。',
              },
            ],
          },
        },
      ],
    },

    // ============ 住宿總覽 ============
    {
      type: 'stays',
      data: {
        items: [
          {
            id: 'st1',
            nights_label: 'Night 1',
            name: '東京文華東方酒店',
            description: '森林之上、銀座之巔、米其林三星樓下。',
            image: {
              url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80',
            },
          },
          {
            id: 'st2',
            nights_label: 'Night 2',
            name: '日光金谷ホテル',
            description: '日本最古老西洋 resort、1873 年創業。',
            image: {
              url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
            },
          },
          {
            id: 'st3',
            nights_label: 'Night 3',
            name: '東山温泉・原瀧',
            description: '會津藩主泡過的湯、露天風呂面溪流。',
            image: {
              url: 'https://images.unsplash.com/photo-1578894383290-7d70c7022f4b?w=1200&q=80',
            },
          },
          {
            id: 'st4',
            nights_label: 'Night 4–5',
            name: '威斯汀仙台',
            description: '仙台最高樓、Westin Heavenly Bed、續住兩晚。',
            image: {
              url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80',
            },
          },
        ],
      },
    },

    // ============ 附錄 ============
    {
      type: 'appendix',
      data: {
        inclusions: [
          '六日全程專車（八人座 Hiace Grand Cabin）',
          '4 晚指定飯店（雙人房 / 雙床）',
          '中華航空台北⇄東京 / 仙台機票（經濟艙）',
          '行程內所有門票 / 體驗費用',
          '行程內所有餐食（5 早 / 5 午 / 4 晚）',
          '專業領隊全程隨團',
        ],
        exclusions: [
          '個人消費（購物 / 自費 SPA 等）',
          '小費（建議每人每天 JPY 1000）',
          '行李超重費 / 額外保險',
          '行程外的餐食與飲品',
        ],
        notices: [
          '本行程依當地天候 / 季節調整、實際路線以出發前確認版為準',
          '日光金谷ホテル / 東山温泉 客室數量有限、確認後依序鎖房',
          '6 月東北早晚溫差大、建議多帶薄外套',
          '行程包車為私人包車、不與其他團體共乘',
        ],
        contact: {
          employee_name: '黒羽 ・ 角落業務',
          employee_phone: '+886 9XX-XXX-XXX',
          employee_email: 'kurohane@corner-travel.tw',
          company_name: '角落旅行社',
          company_phone: '+886 2-XXXX-XXXX',
        },
      },
    },
  ],
}
