"use client"

import { useState, useRef, useCallback } from "react"
import { Paperclip, X, Image, FileText, File } from "lucide-react"

export interface FileAttachment {
  id: string
  name: string
  type: string // mime type
  size: number
  dataUrl?: string // base64 data URL for images
  textContent?: string // extracted text for text/csv files
  preview?: string // thumbnail URL
}

interface FileUploadProps {
  attachments: FileAttachment[]
  onAttachmentsChange: (attachments: FileAttachment[]) => void
  disabled?: boolean
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/csv',
  'text/javascript', 'text/html', 'text/css', 'text/markdown',
  'application/json',
]

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="h-4 w-4" />
  if (type === 'application/pdf') return <FileText className="h-4 w-4" />
  return <File className="h-4 w-4" />
}

export function FileUpload({ attachments, onAttachmentsChange, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const newAttachments: FileAttachment[] = []

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} is too large (max 10MB)`)
        continue
      }

      const attachment: FileAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      }

      if (file.type.startsWith('image/')) {
        const dataUrl = await readAsDataURL(file)
        attachment.dataUrl = dataUrl
        attachment.preview = dataUrl
      } else if (file.type.startsWith('text/') || file.type === 'application/json') {
        attachment.textContent = await readAsText(file)
      } else if (file.type === 'application/pdf') {
        attachment.textContent = `[PDF file: ${file.name} (${formatSize(file.size)})]`
      }

      newAttachments.push(attachment)
    }

    onAttachmentsChange([...attachments, ...newAttachments])
  }, [attachments, onAttachmentsChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [processFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const removeAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== id))
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) processFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {/* Attachment button */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50 min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-30"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Paperclip className={`h-4.5 w-4.5 ${isDragging ? 'text-accent-primary' : ''}`} />
      </button>

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 p-2 flex flex-wrap gap-2 bg-background/95 backdrop-blur-sm border-t border-border/50 rounded-t-xl">
          {attachments.map(att => (
            <div key={att.id} className="relative group flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 border border-border/50 text-xs max-w-[200px]">
              {att.preview ? (
                <img src={att.preview} alt={att.name} className="h-8 w-8 rounded object-cover" />
              ) : (
                getFileIcon(att.type)
              )}
              <span className="truncate">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
