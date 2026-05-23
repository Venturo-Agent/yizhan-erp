import { defineModule } from './_define'

/**
 * 文件中心 — 上傳、編輯、蓋章、合併文件
 *
 * 對應：
 * - 路由：/documents, /documents/[id]
 * - capability：documents.files.{read,write} / documents.seals.{read,write}
 * - tabs：files（我的文件）/ seals（章印管理）
 */
export const DocumentsModule = defineModule({
  code: 'documents',
  name: '文件中心',
  description: '上傳、編輯、蓋章、合併文件（PDF / Word / Excel / PPT）',
  category: 'basic',
  routes: ['/documents', '/documents/[id]'],
  exposedToHr: true,
  tabs: [
    { code: 'files', name: '我的文件', description: '上傳、管理、下載文件' },
    { code: 'seals', name: '章印管理', description: '管理公司章印圖片' },
  ],
})
