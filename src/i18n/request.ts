/**
 * i18n Request Configuration
 * 用於 Server Components
 */

import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async () => {
  // 目前只支援繁體中文，之後可以從 cookie/header 讀取
  const locale = 'zh-TW'

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
