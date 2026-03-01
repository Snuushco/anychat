"use client"

import { useState } from "react"
import { ChevronDown, Loader2, CheckCircle2, XCircle } from "lucide-react"
import type { ToolResult } from "@/lib/tools"

export interface ToolCallInfo {
  id: string
  toolName: string
  toolIcon: string
  params: Record<string, any>
  status: 'running' | 'success' | 'error'
  result?: ToolResult
}

export function ToolCallDisplay({ call }: { call: ToolCallInfo }) {
  const [expanded, setExpanded] = useState(call.status === 'running')

  const paramSummary = Object.values(call.params).map(v => typeof v === 'string' ? `"${v}"` : JSON.stringify(v)).join(', ')

  return (
    <div className="my-2 rounded-xl border border-border/40 bg-muted/20 overflow-hidden text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        <span>{call.toolIcon}</span>
        <span className="font-medium text-xs">{call.toolName}</span>
        <span className="text-xs text-muted-foreground truncate flex-1">{paramSummary}</span>
        {call.status === 'running' && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-primary" />}
        {call.status === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
        {call.status === 'error' && <XCircle className="h-3.5 w-3.5 text-red-500" />}
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && call.result && (
        <div className="px-3 pb-2 border-t border-border/30">
          <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
            {call.result.content}
          </pre>
        </div>
      )}
      {expanded && call.status === 'running' && (
        <div className="px-3 pb-2 border-t border-border/30">
          <p className="mt-2 text-xs text-muted-foreground">Bezig...</p>
        </div>
      )}
    </div>
  )
}
