"use client"

import { useState } from "react"
import { Play, X, Maximize2 } from "lucide-react"

interface HtmlPreviewProps {
  html: string
  description?: string
}

export function HtmlPreview({ html, description }: HtmlPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)

  const blob = new Blob([html], { type: 'text/html' })
  const blobUrl = URL.createObjectURL(blob)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary text-xs font-medium hover:bg-accent-primary/20 transition-colors mt-2"
      >
        <Play className="h-3 w-3" />
        Preview
        {description && <span className="text-muted-foreground ml-1">— {description}</span>}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
              <span className="text-sm font-medium">HTML Preview</span>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe
              src={blobUrl}
              sandbox="allow-scripts"
              className="flex-1 w-full border-0"
              title="HTML Preview"
            />
          </div>
        </div>
      )}
    </>
  )
}

// Detect HTML code blocks in markdown and extract them
export function extractHtmlBlocks(content: string): { html: string; index: number }[] {
  const blocks: { html: string; index: number }[] = []
  const regex = /```html\n([\s\S]*?)```/g
  let match
  while ((match = regex.exec(content)) !== null) {
    blocks.push({ html: match[1].trim(), index: match.index })
  }
  return blocks
}
