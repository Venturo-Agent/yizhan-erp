/**
 * usePassportFiles - 護照檔案處理邏輯
 *
 * 功能：
 * - 檔案選擇和拖放
 * - PDF 轉圖片
 * - 圖片壓縮
 * - 檔案預覽管理
 */

import { useState, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'
import { alert } from '@/lib/ui/alert-dialog'
import type { ProcessedFile } from '../../_types/order-member.types'

interface UsePassportFilesReturn {
  // 狀態
  processedFiles: ProcessedFile[]
  isDragging: boolean
  isProcessing: boolean

  // 操作
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  handleDragOver: (e: React.DragEvent<HTMLLabelElement>) => void
  handleDragLeave: (e: React.DragEvent<HTMLLabelElement>) => void
  handleDrop: (e: React.DragEvent<HTMLLabelElement>) => Promise<void>
  handleRemoveFile: (index: number) => void
  updateFilePreview: (index: number, newPreviewDataUrl: string) => void
  clearFiles: () => void
  compressImage: (file: File, quality?: number) => Promise<File>
}

export function usePassportFiles(): UsePassportFilesReturn {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // PDF 轉 JPG
  const convertPdfToImages = useCallback(async (pdfFile: File): Promise<File[]> => {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`

    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    const images: File[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const scale = 2
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({
        canvasContext: context!,
        viewport: viewport,
      }).promise

      const blob = await new Promise<Blob>(resolve => {
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.85)
      })

      const fileName = `${pdfFile.name.replace('.pdf', '')}_page${i}.jpg`
      const imageFile = new File([blob], fileName, { type: 'image/jpeg' })
      images.push(imageFile)
    }

    return images
  }, [])

  // 處理檔案（PDF 或圖片）
  const processFiles = useCallback(
    async (files: FileList): Promise<ProcessedFile[]> => {
      const newProcessedFiles: ProcessedFile[] = []

      for (const file of Array.from(files)) {
        if (file.type === 'application/pdf') {
          const images = await convertPdfToImages(file)
          for (const img of images) {
            const preview = URL.createObjectURL(img)
            newProcessedFiles.push({
              file: img,
              preview,
              originalName: file.name,
              isPdf: true,
            })
          }
        } else if (file.type.startsWith('image/')) {
          const preview = URL.createObjectURL(file)
          newProcessedFiles.push({
            file,
            preview,
            originalName: file.name,
            isPdf: false,
          })
        }
      }

      return newProcessedFiles
    },
    [convertPdfToImages]
  )

  // 檔案選擇處理
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      setIsProcessing(true)
      try {
        const newFiles = await processFiles(files)
        setProcessedFiles(prev => [...prev, ...newFiles])
      } catch (error) {
        logger.error('處理檔案失敗:', error)
        void alert('檔案處理失敗，請重試', 'error')
      } finally {
        setIsProcessing(false)
      }
    },
    [processFiles]
  )

  // 拖放處理
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (!files || files.length === 0) return

      setIsProcessing(true)
      try {
        const newFiles = await processFiles(files)
        setProcessedFiles(prev => [...prev, ...newFiles])
      } catch (error) {
        logger.error('處理檔案失敗:', error)
        void alert('檔案處理失敗，請重試', 'error')
      } finally {
        setIsProcessing(false)
      }
    },
    [processFiles]
  )

  // 移除檔案
  const handleRemoveFile = useCallback((index: number) => {
    setProcessedFiles(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // 清空所有檔案
  const clearFiles = useCallback(() => {
    processedFiles.forEach(pf => URL.revokeObjectURL(pf.preview))
    setProcessedFiles([])
  }, [processedFiles])

  // 更新檔案預覽（用於圖片增強後）
  const updateFilePreview = useCallback((index: number, newPreviewDataUrl: string) => {
    setProcessedFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[index]) {
        // 釋放舊的預覽 URL
        URL.revokeObjectURL(newFiles[index].preview)

        // 將 data URL 轉換為 File 物件
        const byteString = atob(newPreviewDataUrl.split(',')[1])
        const mimeString = newPreviewDataUrl.split(',')[0].split(':')[1].split(';')[0]
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i)
        }
        const blob = new Blob([ab], { type: mimeString })
        const newFile = new File([blob], newFiles[index].originalName, { type: mimeString })

        // 更新檔案和預覽
        newFiles[index] = {
          ...newFiles[index],
          file: newFile,
          preview: newPreviewDataUrl,
        }
      }
      return newFiles
    })
  }, [])

  // 壓縮圖片
  const compressImage = useCallback(async (file: File, quality = 0.6): Promise<File> => {
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
  }, [])

  return {
    processedFiles,
    isDragging,
    isProcessing,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveFile,
    updateFilePreview,
    clearFiles,
    compressImage,
  }
}
