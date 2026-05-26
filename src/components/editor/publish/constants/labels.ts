/**
 * @migration-status MIGRATED
 * PublishPreview.tsx 已遷移至 next-intl messages/zh-TW.json#publish
 * 此檔案已無 callers，可在確認後刪除。
 * 遷移模式：
 *   舊：import { PUBLISH_LABELS } from './constants/labels'  →  PUBLISH_LABELS.LABEL_9893
 *   新：const t = useTranslations('publish')  →  t('link')
 */
export const PUBLISH_LABELS = {
  LABEL_9893: '連結', // @migration-target: messages/zh-TW.json publish.link
  LABEL_1245: '分享連結', // @migration-target: messages/zh-TW.json publish.shareLink
  LABEL_7099: '此連結可分享給客戶，無需登入即可查看行程', // @migration-target: messages/zh-TW.json publish.shareLinkDesc
}
