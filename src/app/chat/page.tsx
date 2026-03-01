"use client"

import { useState, useEffect, useCallback } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { KeyManager } from "@/components/key-manager"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { getConversations, deleteConversation, type Conversation } from "@/lib/chat-store"

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const loadConversations = useCallback(async () => {
    const convs = await getConversations()
    setConversations(convs)
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  function handleNewChat() {
    setActiveConversation(null)
    setSidebarOpen(false)
  }

  function handleSelectConversation(conv: Conversation) {
    setActiveConversation(conv)
    setSidebarOpen(false)
  }

  async function handleDeleteConversation(id: string) {
    await deleteConversation(id)
    if (activeConversation?.id === id) setActiveConversation(null)
    await loadConversations()
  }

  function handleConversationCreated(conv: Conversation) {
    setActiveConversation(conv)
    setConversations(prev => [conv, ...prev])
  }

  function handleConversationUpdated(conv: Conversation) {
    setActiveConversation(conv)
    setConversations(prev => prev.map(c => c.id === conv.id ? conv : c))
  }

  const sidebarContent = (
    <Sidebar
      conversations={conversations}
      activeId={activeConversation?.id || null}
      onSelect={handleSelectConversation}
      onNew={handleNewChat}
      onDelete={handleDeleteConversation}
      onOpenSettings={() => setSettingsOpen(true)}
    />
  )

  return (
    <div className="h-dvh flex">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-72 border-r shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-2 border-b px-3 py-2">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-sm truncate">
            {activeConversation?.title || "AnyChat"}
          </span>
        </div>

        <div className="flex-1 min-h-0">
          <ChatInterface
            conversation={activeConversation}
            onConversationCreated={handleConversationCreated}
            onConversationUpdated={handleConversationUpdated}
          />
        </div>
      </div>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Keys Beheren</DialogTitle>
          </DialogHeader>
          <KeyManager onKeysChanged={() => {}} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
