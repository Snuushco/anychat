"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { MessageSquarePlus, Trash2, Settings, Key } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import type { Conversation } from "@/lib/chat-store"

interface SidebarProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (conv: Conversation) => void
  onNew: () => void
  onDelete: (id: string) => void
  onOpenSettings: () => void
}

export function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, onOpenSettings }: SidebarProps) {
  return (
    <div className="flex flex-col h-full bg-muted/50">
      <div className="p-3 flex items-center justify-between">
        <h1 className="font-bold text-lg">💬 AnyChat</h1>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={onNew}>
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No conversations yet
            </p>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors
                ${conv.id === activeId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}
              `}
              onClick={() => onSelect(conv)}
            >
              <span className="flex-1 truncate">{conv.title || 'New conversation'}</span>
              {conv.totalCost > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  €{conv.totalCost.toFixed(3)}
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(conv.id) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-2">
        <Button variant="ghost" className="w-full justify-start gap-2 text-sm" onClick={onOpenSettings}>
          <Key className="h-4 w-4" />
          API Keys
        </Button>
      </div>
    </div>
  )
}
