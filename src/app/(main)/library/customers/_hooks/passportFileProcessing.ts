/**
 * passportFileProcessing.ts
 * 護照圖片處理工具（PDF 轉圖、壓縮）
 * 拆分自 usePassportUpload.ts 2026-05-16
 *
 * 功能：
 * - convertPdfToImages()：PDF 每頁轉成 JPEG（scale 2.0）
 * - compressImage()：壓縮至 800KB 以下（遞迴降 quality）
 *
 * 注意：這兩個函數都需要瀏覽器 DOM API（canvas、FileReader）、不可在 server 端用。
 */

/**
 * PDF 轉圖片（每頁轉成一張 JPEG）
 * 使用 pdfjs-dist 動態 import（避免 server bundle 過大）
 */
export async function convertPdfToImages(pdfFile: File): Promise<File[]> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`

  const arrayBuffer = await pdfFile.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const images: File[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({ canvasContext: context, viewport }).promise

    const blob = await new Promise<Blob>(resolve => {
      canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9)
    })

    const fileName = pdfFile.name.replace('.pdf', `_page${i}.jpg`)
    const imageFile = new File([blob], fileName, { type: 'image/jpeg' })
    images.push(imageFile)
  }

  return images
}

/**
 * 壓縮圖片，確保小於 800KB
 * quality 從 0.6 開始、每次 -0.1 遞迴直到符合大小或 quality < 0.2
 * 同時將最大邊長限制在 1200px
 */
export async function compressImage(file: File, quality = 0.6): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = e => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        const maxDimension = 1200
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          async blob => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })

              if (compressedFile.size > 800 * 1024 && quality > 0.2) {
                resolve(await compressImage(file, quality - 0.1))
              } else {
                resolve(compressedFile)
              }
            } else {
              reject(new Error('壓縮失敗'))
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}
