"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Square, RotateCcw, Copy, Check, DollarSign } from "lucide-react"
import { ModelSelector } from "./model-selector"
import { streamChat, type ChatMessage as AIChatMessage } from "@/lib/ai-client"
import { MODELS, calculateCost, getModelById, PROVIDER_INFO } from "@/lib/models"
import {
  createConversation, updateConversation, addMessage as storeMessage,
  getMessages, type Message, type Conversation
} from "@/lib/chat-store"
import { getAllKeys } from "@/lib/key-store"

interface ChatInterfaceProps {
  conversation: Conversation | null
  onConversationCreated: (conv: Conversation) => void
  onConversationUpdated: (conv: Conversation) => void
}

export function ChatInterface({ conversation, onConversationCreated, onConversationUpdated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [selectedModel, setSelectedModel] = useState("gpt-4o")
  const [availableProviders, setAvailableProviders] = useState<Set<string>>(new Set())
  const [sessionCost, setSessionCost] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    loadKeys()
  }, [])

  const loadMessages = useCallback(async () => {
    if (!conversation) {
      setMessages([])
      setSessionCost(0)
      return
    }
    const msgs = await getMessages(conversation.id)
    setMessages(msgs)
    setSessionCost(msgs.reduce((sum, m) => sum + (m.cost || 0), 0))
    setSelectedModel(conversation.model)
  }, [conversation])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  async function loadKeys() {
    const keys = await getAllKeys()
    setAvailableProviders(new Set(keys.map(k => k.provider)))
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  async function handleSend() {
    if (!input.trim() || isStreaming) return

    const model = getModelById(selectedModel) || MODELS[0]
    let conv = conversation

    if (!conv) {
      conv = await createConversation(model.id)
      onConversationCreated(conv)
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversationId: conv.id,
      role: 'user',
      content: input.trim(),
      model: model.id,
      createdAt: new Date().toISOString(),
    }

    await storeMessage(userMsg)
    setMessages(prev => [...prev, userMsg])
    setInput("")

    // Build AI message history
    const allMsgs = [...messages, userMsg]
    const aiMessages: AIChatMessage[] = allMsgs.map(m => ({
      role: m.role,
      content: m.content,
    }))

    setIsStreaming(true)
    setStreamingContent("")
    const controller = new AbortController()
    abortRef.current = controller

    let fullContent = ""

    await streamChat(model.id, model.provider, aiMessages, {
      onToken: (token) => {
        fullContent += token
        setStreamingContent(fullContent)
      },
      onDone: async (usage) => {
        const cost = calculateCost(model, usage.inputTokens, usage.outputTokens)
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          conversationId: conv!.id,
          role: 'assistant',
          content: fullContent,
          model: model.id,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cost,
          createdAt: new Date().toISOString(),
        }
        await storeMessage(assistantMsg)
        setMessages(prev => [...prev, assistantMsg])
        setStreamingContent("")
        setIsStreaming(false)
        setSessionCost(prev => prev + cost)

        // Update conversation title from first message
        const updatedConv: Conversation = {
          ...conv!,
          title: allMsgs.length <= 1 ? input.trim().slice(0, 50) : conv!.title,
          model: model.id,
          messageCount: allMsgs.length + 1,
          totalCost: (conv!.totalCost || 0) + cost,
          updatedAt: new Date().toISOString(),
        }
        await updateConversation(updatedConv)
        onConversationUpdated(updatedConv)
      },
      onError: (error) => {
        setStreamingContent("")
        setIsStreaming(false)
        const errMsg: Message = {
          id: crypto.randomUUID(),
          conversationId: conv!.id,
          role: 'assistant',
          content: `⚠️ Fout: ${error}`,
          model: model.id,
          createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, errMsg])
      },
    }, controller.signal)
  }

  function handleStop() {
    abortRef.current?.abort()
    setIsStreaming(false)
    setStreamingContent("")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function copyMessage(id: string, content: string) {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <ModelSelector
          selectedModel={selectedModel}
          onSelect={(m) => setSelectedModel(m.id)}
          availableProviders={availableProviders}
        />
        {sessionCost > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            €{sessionCost.toFixed(4)}
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="max-w-2xl mx-auto py-4 space-y-4">
          {messages.length === 0 && !streamingContent && (
            <div className="text-center py-20 space-y-3">
              <p className="text-4xl">💬</p>
              <h2 className="text-xl font-semibold">Hoi! Waarmee kan ik helpen?</h2>
              <p className="text-sm text-muted-foreground">
                Stel een vraag aan {getModelById(selectedModel)?.name || 'AI'}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap
                  ${msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted rounded-bl-md'
                  }`}
              >
                {msg.content}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-2 pt-1 border-t border-border/30">
                    <button
                      onClick={() => copyMessage(msg.id, msg.content)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                    {msg.cost !== undefined && msg.cost > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        €{msg.cost.toFixed(4)} · {msg.inputTokens}+{msg.outputTokens} tokens
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm whitespace-pre-wrap">
                {streamingContent}
                <span className="inline-block w-1.5 h-4 bg-foreground/50 animate-pulse ml-0.5" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4 shrink-0">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Typ een bericht..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          {isStreaming ? (
            <Button size="icon" variant="destructive" onClick={handleStop} className="shrink-0">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
