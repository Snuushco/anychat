"use client"

import { useState, useEffect, useCallback } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { KeyManager } from "@/components/key-manager"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getConversations, deleteConversation, type Conversation } from "@/lib/chat-store"
import { useSearchParams } from "next/navigation"
import { getAgentById } from "@/lib/agents"
import { Suspense } from "react"

function ChatPageInner() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [agentSystemPrompt, setAgentSystemPrompt] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const loadConversations = useCallback(async () => {
    const convs = await getConversations()
    setConversations(convs)
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    const agentId = searchParams.get("agent")
    if (agentId) {
      const agent = getAgentById(agentId)
      if (agent) setAgentSystemPrompt(agent.systemPrompt)
    }
  }, [searchParams])

  function handleConversationCreated(conv: Conversation) {
    setActiveConversation(conv)
    setConversations(prev => [conv, ...prev])
  }

  function handleConversationUpdated(conv: Conversation) {
    setActiveConversation(conv)
    setConversations(prev => prev.map(c => c.id === conv.id ? conv : c))
  }

  return (
    <div className="h-[calc(100dvh-5rem)] md:h-dvh flex flex-col">
      <div className="flex-1 min-h-0">
        <ChatInterface
          conversation={activeConversation}
          onConversationCreated={handleConversationCreated}
          onConversationUpdated={handleConversationUpdated}
          agentSystemPrompt={agentSystemPrompt}
        />
      </div>

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

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  )
}
