'use client'

import { useState, useRef, useCallback } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Type,
  PenTool,
  Image,
  Stamp,
  GripVertical,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import SignaturePad from 'signature_pad'

// ============================================================================
// Types
// ============================================================================

interface PDFFile {
  id: string
  name: string
  file: File
  pages: number
  thumbnailUrl?: string
}

interface PageItem {
  id: string
  pdfId: string
  pageIndex: number
  thumbnail?: string
}

interface OverlayItem {
  id: string
  pageIndex: number
  type: 'text' | 'signature' | 'seal'
  x: number
  y: number
  width: number
  height: number
  data: string // base64 for image, text for text
  rotation?: number
}

// ============================================================================
// PDF Merge & Operations (using pdf-lib)
// ============================================================================

async function getPdfPageCount(file: File): Promise<number> {
  const PDFJS = await import('pdfjs-dist')
  PDFJS.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS.version}/pdf.worker.min.js`

  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = PDFJS.getDocument(arrayBuffer)
  const pdf = await loadingTask.promise
  return pdf.numPages
}

async function generateAllThumbnails(
  pdfFiles: PDFFile[],
  scale = 0.3
): Promise<Map<string, string>> {
  const PDFJS = await import('pdfjs-dist')
  PDFJS.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS.version}/pdf.worker.min.js`

  const thumbnails = new Map<string, string>()

  for (const pdfFile of pdfFiles) {
    const arrayBuffer = await pdfFile.file.arrayBuffer()
    const loadingTask = PDFJS.getDocument(arrayBuffer)
    const pdf = await loadingTask.promise

    for (let i = 0; i < pdf.numPages; i++) {
      const page = await pdf.getPage(i + 1)
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!

      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({
        canvasContext: context,
        viewport,
      }).promise

      const key = `${pdfFile.id}_${i}`
      thumbnails.set(key, canvas.toDataURL('image/png'))
    }
  }

  return thumbnails
}

// ============================================================================
// Main Component
// ============================================================================

export function DocumentsPage() {
  // State
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([])
  const [pages, setPages] = useState<PageItem[]>([])
  const [overlays, setOverlays] = useState<OverlayItem[]>([])
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map())

  // Dialog states
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)
  const [textDialogOpen, setTextDialogOpen] = useState(false)
  const [sealDialogOpen, setSealDialogOpen] = useState(false)

  // Signature pad ref
  const signaturePadRef = useRef<SignaturePad | null>(null)
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Text input state
  const [textInput, setTextInput] = useState('')
  const [fontSize, setFontSize] = useState(14)
  const [textColor, setTextColor] = useState('#000000')

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sealInputRef = useRef<HTMLInputElement>(null)

  // Drag state
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  // ============================================================================
  // File Upload
  // ============================================================================

  const handleFiles = useCallback(
    async (files: FileList) => {
      setLoading(true)
      try {
        const pdfFiles: PDFFile[] = []

        for (const file of Array.from(files)) {
          if (file.type !== 'application/pdf') continue

          const pageCount = await getPdfPageCount(file)
          const pdfFile: PDFFile = {
            id: crypto.randomUUID(),
            name: file.name,
            file,
            pages: pageCount,
          }
          pdfFiles.push(pdfFile)
        }

        // Generate thumbnails
        const thumbs = await generateAllThumbnails(pdfFiles)
        setThumbnails(thumbs)

        // Add to pages list
        const newPages: PageItem[] = []
        pdfFiles.forEach(pdf => {
          for (let i = 0; i < pdf.pages; i++) {
            newPages.push({
              id: crypto.randomUUID(),
              pdfId: pdf.id,
              pageIndex: i,
            })
          }
        })

        setPdfFiles(prev => [...prev, ...pdfFiles])
        setPages(prev => [...prev, ...newPages])

        // Select first page
        if (pages.length === 0 && newPages.length > 0) {
          setSelectedPageIndex(0)
        }
      } finally {
        setLoading(false)
      }
    },
    [pages.length]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  // ============================================================================
  // Page Management
  // ============================================================================

  const deletePage = useCallback(
    (pageIndex: number) => {
      setPages(prev => prev.filter((_, i) => i !== pageIndex))
      if (selectedPageIndex >= pages.length - 1) {
        setSelectedPageIndex(Math.max(0, pages.length - 2))
      }
    },
    [selectedPageIndex, pages.length]
  )

  const clearAll = useCallback(() => {
    setPdfFiles([])
    setPages([])
    setOverlays([])
    setThumbnails(new Map())
    setSelectedPageIndex(0)
  }, [])

  // Drag to reorder
  const handlePageDragStart = (index: number) => {
    dragItem.current = index
  }

  const handlePageDragEnter = (index: number) => {
    dragOverItem.current = index
  }

  const handlePageDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) return

    setPages(prev => {
      const newPages = [...prev]
      const draggedItem = newPages[dragItem.current!]
      newPages.splice(dragItem.current!, 1)
      newPages.splice(dragOverItem.current!, 0, draggedItem)
      return newPages
    })

    dragItem.current = null
    dragOverItem.current = null
  }

  // ============================================================================
  // Overlay Management
  // ============================================================================

  const addTextOverlay = () => {
    if (!textInput.trim()) return

    const newOverlay: OverlayItem = {
      id: crypto.randomUUID(),
      pageIndex: selectedPageIndex,
      type: 'text',
      x: 50,
      y: 100,
      width: 200,
      height: fontSize + 10,
      data: textInput,
    }

    setOverlays(prev => [...prev, newOverlay])
    setTextInput('')
    setTextDialogOpen(false)
  }

  const openSignatureDialog = () => {
    setSignatureDialogOpen(true)
    setTimeout(() => {
      const canvas = signatureCanvasRef.current
      if (canvas) {
        const signaturePad = new SignaturePad(canvas, {
          backgroundColor: 'rgba(255, 255, 255, 0)',
          penColor: 'black',
        })
        signaturePadRef.current = signaturePad
      }
    }, 100)
  }

  const addSignatureOverlay = () => {
    const signaturePad = signaturePadRef.current
    if (!signaturePad || signaturePad.isEmpty()) return

    const dataUrl = signaturePad.toDataURL('image/png')

    const newOverlay: OverlayItem = {
      id: crypto.randomUUID(),
      pageIndex: selectedPageIndex,
      type: 'signature',
      x: 50,
      y: 200,
      width: 200,
      height: 80,
      data: dataUrl,
    }

    setOverlays(prev => [...prev, newOverlay])
    setSignatureDialogOpen(false)
    signaturePad.clear()
  }

  const clearSignature = () => {
    signaturePadRef.current?.clear()
  }

  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string

      const newOverlay: OverlayItem = {
        id: crypto.randomUUID(),
        pageIndex: selectedPageIndex,
        type: 'seal',
        x: 100,
        y: 300,
        width: 100,
        height: 100,
        data: dataUrl,
      }

      setOverlays(prev => [...prev, newOverlay])
      setSealDialogOpen(false)
    }
    reader.readAsDataURL(file)

    e.target.value = ''
  }

  const deleteOverlay = (overlayId: string) => {
    setOverlays(prev => prev.filter(o => o.id !== overlayId))
  }

  // ============================================================================
  // Download PDF
  // ============================================================================

  const downloadPDF = useCallback(async () => {
    setLoading(true)
    try {
      const { PDFDocument, rgb } = await import('pdf-lib')

      const mergedPdf = await PDFDocument.create()

      // Load all source PDFs
      const pdfDocs = new Map<string, any>()
      for (const pdfFile of pdfFiles) {
        const arrayBuffer = await pdfFile.file.arrayBuffer()
        const doc = await PDFDocument.load(arrayBuffer)
        pdfDocs.set(pdfFile.id, doc)
      }

      // Copy pages in order
      for (const pageItem of pages) {
        const srcDoc = pdfDocs.get(pageItem.pdfId)
        if (!srcDoc) continue

        const [copiedPage] = await mergedPdf.copyPages(srcDoc, [pageItem.pageIndex])

        // Add overlays for this page
        const pageOverlays = overlays.filter(o => o.pageIndex === pages.indexOf(pageItem))
        for (const overlay of pageOverlays) {
          if (overlay.type === 'text') {
            // Add text annotation using page drawing
            // Note: pdf-lib doesn't have native text annotations, so we draw text as content
            const font = await mergedPdf.embedFont('Helvetica')
            copiedPage.drawText(overlay.data, {
              x: overlay.x,
              y: overlay.y,
              size: fontSize,
              color: rgb(0, 0, 0),
            })
          } else if (overlay.type === 'signature' || overlay.type === 'seal') {
            // Add image overlay
            const imageBytes = await fetch(overlay.data).then(r => r.arrayBuffer())
            let image
            if (overlay.type === 'signature') {
              image = await mergedPdf.embedPng(imageBytes)
            } else {
              image = await mergedPdf.embedPng(imageBytes)
            }

            copiedPage.drawImage(image, {
              x: overlay.x,
              y: overlay.y,
              width: overlay.width,
              height: overlay.height,
            })
          }
        }

        mergedPdf.addPage(copiedPage)
      }

      const pdfBytes = await mergedPdf.save()

      // Download
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `merged_${Date.now()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }, [pdfFiles, pages, overlays, fontSize])

  // ============================================================================
  // Render
  // ============================================================================

  const pageOverlays = overlays.filter(o => o.pageIndex === selectedPageIndex)

  return (
    <ContentPageLayout title="文件中心" icon={FileText}>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-4 border-b bg-card">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" />
            上傳 PDF
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setTextDialogOpen(true)}
            disabled={pages.length === 0}
          >
            <Type className="w-4 h-4 mr-1" />
            打字
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openSignatureDialog}
            disabled={pages.length === 0}
          >
            <PenTool className="w-4 h-4 mr-1" />
            簽名
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSealDialogOpen(true)}
            disabled={pages.length === 0}
          >
            <Stamp className="w-4 h-4 mr-1" />
            印章
          </Button>

          <div className="flex-1" />

          <Badge variant="secondary">{pages.length} 頁</Badge>

          <Button variant="outline" size="sm" onClick={clearAll} disabled={pages.length === 0}>
            <Trash2 className="w-4 h-4 mr-1" />
            清除
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={downloadPDF}
            disabled={pages.length === 0 || loading}
          >
            <Download className="w-4 h-4 mr-1" />
            下載 PDF
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Page Thumbnails Panel */}
          <div className="w-48 border-r bg-muted/30 overflow-y-auto p-2">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
              頁面列表（拖曳排序）
            </div>
            <div className="space-y-1">
              {pages.map((page, index) => {
                const thumbKey = `${page.pdfId}_${page.pageIndex}`
                const thumbUrl = thumbnails.get(thumbKey)

                return (
                  <div
                    key={page.id}
                    draggable
                    onDragStart={() => handlePageDragStart(index)}
                    onDragEnter={() => handlePageDragEnter(index)}
                    onDragEnd={handlePageDragEnd}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => setSelectedPageIndex(index)}
                    className={cn(
                      'relative cursor-pointer rounded border transition-all',
                      selectedPageIndex === index
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-border',
                      dragOverItem.current === index && 'bg-primary/10'
                    )}
                  >
                    <div className="aspect-[3/4] bg-muted rounded overflow-hidden relative">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={`Page ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                          Loading...
                        </div>
                      )}

                      {/* Page number badge */}
                      <div className="absolute top-1 left-1 bg-background/90 text-xs font-medium px-1.5 py-0.5 rounded">
                        {index + 1}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          deletePage(index)
                        }}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded p-0.5 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>

                      {/* Drag handle */}
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity">
                        <GripVertical className="w-3 h-3 text-foreground/70" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {pages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground mt-8">尚未上傳 PDF</div>
            )}
          </div>

          {/* Preview Panel */}
          <div
            className="flex-1 overflow-auto p-4 flex items-start justify-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {pages.length === 0 ? (
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg w-full max-w-2xl h-96 flex flex-col items-center justify-center gap-4 transition-colors',
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
                )}
              >
                <Upload className="w-12 h-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">拖放 PDF 檔案到此處</p>
                  <p className="text-sm text-muted-foreground mt-1">或點擊「上傳 PDF」選擇檔案</p>
                </div>
              </div>
            ) : selectedPageIndex < pages.length ? (
              <div className="relative bg-white shadow-lg rounded">
                {/* Page preview with overlays */}
                <div className="relative" style={{ width: 595, height: 842 }}>
                  {/* Background (placeholder) */}
                  <div className="absolute inset-0 bg-white" />

                  {/* Thumbnail background */}
                  {(() => {
                    const page = pages[selectedPageIndex]
                    const thumbKey = `${page.pdfId}_${page.pageIndex}`
                    const thumbUrl = thumbnails.get(thumbKey)
                    return thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={`Page ${selectedPageIndex + 1}`}
                        className="w-full h-full object-contain"
                        style={{ width: 595, height: 842 }}
                      />
                    ) : null
                  })()}

                  {/* Overlays */}
                  {pageOverlays.map(overlay => (
                    <div
                      key={overlay.id}
                      className="absolute cursor-move group"
                      style={{
                        left: overlay.x,
                        top: overlay.y,
                        width: overlay.width,
                        height: overlay.height,
                      }}
                      onClick={() => deleteOverlay(overlay.id)}
                    >
                      {overlay.type === 'text' ? (
                        <div
                          className="w-full h-full flex items-center"
                          style={{
                            fontSize: overlay.height - 10,
                            color: textColor,
                          }}
                        >
                          {overlay.data}
                        </div>
                      ) : (
                        <img
                          src={overlay.data}
                          alt={overlay.type}
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      )}
                      {/* Hover delete */}
                      <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Page info */}
                <div className="absolute bottom-2 right-2 bg-background/90 text-xs px-2 py-1 rounded">
                  第 {selectedPageIndex + 1} / {pages.length} 頁
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ============================================================================
          Text Dialog
          ============================================================================ */}
      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增文字</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">文字內容</label>
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                className="w-full border rounded p-2 min-h-[80px]"
                placeholder="輸入文字..."
              />
            </div>
            <div className="flex gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">字體大小</label>
                <input
                  type="number"
                  value={fontSize}
                  onChange={e => setFontSize(Number(e.target.value))}
                  min={8}
                  max={72}
                  className="w-20 border rounded p-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">顏色</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  className="w-10 h-10 border rounded cursor-pointer"
                />
              </div>
            </div>
            <Button onClick={addTextOverlay} disabled={!textInput.trim()}>
              <Check className="w-4 h-4 mr-1" />
              確認
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================================
          Signature Dialog
          ============================================================================ */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增簽名</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded bg-white">
              <canvas
                ref={signatureCanvasRef}
                width={400}
                height={150}
                className="w-full touch-none"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addSignatureOverlay}>
                <Check className="w-4 h-4 mr-1" />
                確認
              </Button>
              <Button variant="outline" onClick={clearSignature}>
                <Trash2 className="w-4 h-4 mr-1" />
                清除
              </Button>
              <Button variant="ghost" onClick={() => setSignatureDialogOpen(false)}>
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================================
          Seal Dialog
          ============================================================================ */}
      <Dialog open={sealDialogOpen} onOpenChange={setSealDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增印章</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => sealInputRef.current?.click()}
            >
              <Image className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">點擊選擇印章圖片</p>
              <p className="text-xs text-muted-foreground mt-1">支援 PNG、JPG</p>
            </div>
            <input
              ref={sealInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleSealUpload}
            />
          </div>
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
