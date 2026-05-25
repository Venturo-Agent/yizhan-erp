/**
 * 臨時：反查永豐 OrderQuery 看回應結構（對齊 isPaidFromQuery、測完刪）
 * 跑法：金鑰 source 後、QUERY_ORDER_NO=Vxxx npx tsx scripts/sinopac-query.ts
 */
import { callApiService } from '@/lib/payment-providers/sinopac/client'
import type { SinopacConfig } from '@/lib/payment-providers/sinopac/config'

function reqEnv(n: string): string {
  const v = process.env[n]
  if (!v) { console.error(`缺 ${n}`); process.exit(1) }
  return v
}

async function main() {
  const config: SinopacConfig = {
    shopNo: reqEnv('SINOPAC_SMOKE_SHOP_NO'),
    merchantUbn: '',
    hash: {
      A1: reqEnv('SINOPAC_SMOKE_HASH_A1'),
      A2: reqEnv('SINOPAC_SMOKE_HASH_A2'),
      B1: reqEnv('SINOPAC_SMOKE_HASH_B1'),
      B2: reqEnv('SINOPAC_SMOKE_HASH_B2'),
    },
    xKey: reqEnv('SINOPAC_SMOKE_X_KEY'),
    sandboxMode: true,
    baseUrl: 'https://apisbx.sinopac.com/funBIZ-Sbx/QPay.WebAPI/api/',
  }
  const orderNo = reqEnv('QUERY_ORDER_NO')
  const payType = process.env.QUERY_PAYTYPE || 'C'
  console.log(`→ OrderQuery 反查 ${orderNo} (PayType=${payType})\n`)
  const res = await callApiService(config, 'OrderQuery', {
    ShopNo: config.shopNo,
    OrderNo: orderNo,
    PayType: payType,
  })
  console.log(JSON.stringify(res, null, 2))
}
main().catch(e => { console.error('失敗：', e); process.exit(1) })
