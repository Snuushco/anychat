"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Square, Copy, Check, DollarSign, Zap, MessageSquare, Volume2, Key, Coins, Gift, ArrowRight } from "lucide-react"
import { ModelSelector } from "./model-selector"
import { streamChat, streamChatWithTools, type ChatMessage as AIChatMessage, type ContentPart } from "@/lib/ai-client"
import { MODELS, calculateCost, getModelById } from "@/lib/models"
import { getEnabledTools, ALL_TOOLS, getToolById, getAllToolsWithPlugins, type Tool } from "@/lib/tools"
import { ToolCallDisplay, type ToolCallInfo } from "./tool-call-display"
import {
  createConversation, updateConversation, addMessage as storeMessage, updateMessage,
  getMessages, type Message, type Conversation, type MessageTransport
} from "@/lib/chat-store"
import { getAllKeys } from "@/lib/key-store"
import { getCreditBalance, getModelCreditCost, refreshCreditBalanceFromServer, setCreditBalance as setLocalCreditBalance, type CreditBalance } from "@/lib/credits"
import { SUGGESTED_PROMPTS } from "@/lib/prompts"
import { InlineKeySetup } from "./inline-key-setup"
import { FileUpload, type FileAttachment } from "./file-upload"
import { VoiceInput } from "./voice-input"
import { CameraButton } from "./camera-capture"
import { HtmlPreview, extractHtmlBlocks } from "./html-preview"
import { getRecentMemories, buildMemoryContext } from "@/lib/memory"
import { speak, getAutoSpeak, getSelectedVoice } from "@/lib/tts"

interface ChatInterfaceProps {
  conversation: Conversation | null
  onConversationCreated: (conv: Conversation) => void
  onConversationUpdated: (conv: Conversation) => void
  agentSystemPrompt?: string | null
  initialPrompt?: string | null
}

interface FreeUsageState {
  count: number
  date: string
  limit: number
}

export function ChatInterface({ conversation, onConversationCreated, onConversationUpdated, agentSystemPrompt, initialPrompt }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [selectedModel, setSelectedModel] = useState("gpt-4.1")
  const [availableProviders, setAvailableProviders] = useState<Set<string>>(new Set())
  const [sessionCost, setSessionCost] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [agentMode, setAgentMode] = useState(false)
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallInfo[]>([])
  const [showKeyGate, setShowKeyGate] = useState<{ provider: import("@/lib/models").Provider; modelName: string; pendingMessage: string } | null>(null)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [memoryContext, setMemoryContext] = useState<string>("")
  const [allTools, setAllTools] = useState<Tool[]>(ALL_TOOLS)
  const [freeUsage, setFreeUsage] = useState<FreeUsageState | null>(null)
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

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

  useEffect(() => {
    if (!initialPrompt) return
    setInput(prev => prev || initialPrompt)
  }, [initialPrompt])

  function getTodayDateKey(): string {
    return new Date().toISOString().slice(0, 10)
  }

  function loadFreeUsageState() {
    try {
      const raw = localStorage.getItem("anychat_free_usage")
      if (!raw) return
      const parsed = JSON.parse(raw) as FreeUsageState
      if (parsed?.date === getTodayDateKey()) {
        setFreeUsage(parsed)
      } else {
        const reset = { count: 0, date: getTodayDateKey(), limit: 20 }
        localStorage.setItem("anychat_free_usage", JSON.stringify(reset))
        setFreeUsage(reset)
      }
    } catch {
      // ignore invalid local storage
    }
  }

  async function loadKeysAndDefaultModel(): Promise<void> {
    const keys = await getAllKeys()
    const localCredits = await getCreditBalance().catch(() => null)
    const syncedCredits = await refreshCreditBalanceFromServer().catch(() => null)
    const credits = syncedCredits || localCredits
    setCreditBalance(credits)
    const providers = new Set<string>(["free", ...keys.map(k => k.provider)])
    if (credits && credits.credits > 0) {
      providers.add("credits")
    }
    setAvailableProviders(providers)

    const saved = localStorage.getItem("anychat_default_model")
    if (saved) {
      setSelectedModel(saved)
      return
    }

    if (keys.length === 0) {
      setSelectedModel("free")
      return
    }

    setSelectedModel("gpt-4.1")
  }

  useEffect(() => {
    loadKeysAndDefaultModel()
    loadFreeUsageState()
    getRecentMemories(20).then(memories => {
      setMemoryContext(buildMemoryContext(memories))
    }).catch(() => {})
    getAllToolsWithPlugins().then(setAllTools).catch(() => {})
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  function canUseCreditsForModel(modelId: string): boolean {
    const needed = getModelCreditCost(modelId)
    return (creditBalance?.credits ?? 0) >= needed
  }

  function getTransportProvider(model: { id: string; provider: import("@/lib/models").Provider }): import("@/lib/models").Provider {
    if (model.provider === "free") return "free"
    if (availableProviders.has(model.provider)) return model.provider
    if (canUseCreditsForModel(model.id)) return "credits"
    return model.provider
  }

  function toMessageTransport(provider: import("@/lib/models").Provider): MessageTransport {
    if (provider === 'free') return 'free'
    if (provider === 'credits') return 'credits'
    return 'byok'
  }

  function mapErrorCode(error: string): string {
    const normalized = error.toLowerCase()
    if (normalized.includes('insufficient credits')) return 'insufficient_credits'
    if (normalized.includes('invalid') && normalized.includes('key')) return 'provider_auth'
    if (normalized.includes('rate limit')) return 'provider_rate_limit'
    if (normalized.includes('no internet') || normalized.includes('connection')) return 'network_offline'
    if (normalized.includes('too long') || normalized.includes('timeout')) return 'provider_timeout'
    return 'unknown'
  }

  function getErrorActions(errorCode: string) {
    switch (errorCode) {
      case 'insufficient_credits':
        return { primaryLabel: 'Buy credits', primaryHref: '/credits', secondaryLabel: 'Add key', secondaryHref: '/settings' }
      case 'provider_auth':
        return { primaryLabel: 'Add key', primaryHref: '/settings', secondaryLabel: 'Use credits', secondaryHref: '/credits' }
      default:
        return { primaryLabel: 'Retry' }
    }
  }

  async function handleSend(overrideInput?: string) {
    const text = overrideInput ?? input
    if ((!text.trim() && attachments.length === 0) || isStreaming) return

    const model = getModelById(selectedModel) || MODELS[0]
    const transportProvider = getTransportProvider(model)

    // If no BYOK key and no credits fallback, show key setup
    if (model.provider !== 'free' && transportProvider === model.provider && !availableProviders.has(model.provider)) {
      setShowKeyGate({ provider: model.provider, modelName: model.name, pendingMessage: text.trim() })
      return
    }

    let conv = conversation

    if (!conv) {
      conv = await createConversation(model.id)
      onConversationCreated(conv)
    }

    // Build content parts if there are attachments
    const currentAttachments = [...attachments]
    let displayContent = text.trim()

    // Add file info to display
    if (currentAttachments.length > 0) {
      const fileNames = currentAttachments.map(a => `📎 ${a.name}`).join(', ')
      displayContent = displayContent ? `${displayContent}\n${fileNames}` : fileNames
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversationId: conv.id,
      role: 'user',
      content: displayContent,
      model: model.id,
      status: 'sent',
      transport: toMessageTransport(transportProvider),
      attemptCount: 1,
      createdAt: new Date().toISOString(),
    }

    await storeMessage(userMsg)
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setAttachments([])
    setLastFailedInput(null)

    const allMsgs = [...messages, userMsg]
    const aiMessages: AIChatMessage[] = []

    // Inject memory context
    if (memoryContext) {
      aiMessages.push({ role: 'system' as const, content: memoryContext })
    }

    // Inject agent system prompt if present
    if (agentSystemPrompt) {
      aiMessages.push({ role: 'user' as const, content: `[System]: ${agentSystemPrompt}` })
      aiMessages.push({ role: 'assistant' as const, content: "Understood, I'll take on this role." })
    }

    // Build the messages, with the last user message potentially multimodal
    const prevMsgs = allMsgs.slice(0, -1)
    prevMsgs.forEach(m => {
      aiMessages.push({ role: m.role, content: m.content })
    })

    // Build multimodal content for the current message
    if (currentAttachments.length > 0) {
      const parts: ContentPart[] = []
      if (text.trim()) parts.push({ type: 'text', text: text.trim() })

      for (const att of currentAttachments) {
        if (att.dataUrl && att.type.startsWith('image/')) {
          // Extract base64 data from data URL
          const base64 = att.dataUrl.split(',')[1]
          parts.push({ type: 'image', mimeType: att.type, data: base64 })
        } else if (att.textContent) {
          parts.push({ type: 'text', text: `\n\n--- File: ${att.name} ---\n${att.textContent}\n---` })
        }
      }
      aiMessages.push({ role: 'user', content: parts })
    } else {
      aiMessages.push({ role: 'user', content: text.trim() })
    }

    const assistantMessageId = crypto.randomUUID()
    const pendingAssistantMessage: Message = {
      id: assistantMessageId,
      conversationId: conv.id,
      role: 'assistant',
      content: '',
      model: model.id,
      status: 'streaming',
      transport: toMessageTransport(transportProvider),
      attemptCount: 1,
      createdAt: new Date().toISOString(),
    }
    await storeMessage(pendingAssistantMessage)
    setMessages(prev => [...prev, pendingAssistantMessage])

    setIsStreaming(true)
    setStreamingContent("")
    setActiveToolCalls([])
    const controller = new AbortController()
    abortRef.current = controller

    let fullContent = ""

    const onDone = async (usage: { inputTokens: number; outputTokens: number }) => {
      if (transportProvider === 'free') {
        const today = getTodayDateKey()
        const current = freeUsage && freeUsage.date === today ? freeUsage : { count: 0, date: today, limit: 20 }
        const nextUsage = { ...current, count: Math.min(current.limit, current.count + 1) }
        setFreeUsage(nextUsage)
        localStorage.setItem("anychat_free_usage", JSON.stringify(nextUsage))
      }

      if (transportProvider === 'credits') {
        const refreshed = await refreshCreditBalanceFromServer()
        if (refreshed) setCreditBalance(refreshed)
      }

      const cost = calculateCost(model, usage.inputTokens, usage.outputTokens)
      const assistantMsg: Message = {
        ...pendingAssistantMessage,
        content: fullContent,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cost,
        status: 'sent',
      }
      await updateMessage(assistantMsg)
      setMessages(prev => prev.map((msg) => msg.id === assistantMessageId ? assistantMsg : msg))
      setStreamingContent("")
      setIsStreaming(false)
      setSessionCost(prev => prev + cost)

      // Auto-speak if enabled
      if (getAutoSpeak() && fullContent) {
        speak(fullContent, 'en-US', getSelectedVoice() || undefined)
      }

      const updatedConv: Conversation = {
        ...conv!,
        title: allMsgs.length <= 1 ? text.trim().slice(0, 50) : conv!.title,
        model: model.id,
        messageCount: allMsgs.length + 1,
        totalCost: (conv!.totalCost || 0) + cost,
        updatedAt: new Date().toISOString(),
      }
      await updateConversation(updatedConv)
      onConversationUpdated(updatedConv)
    }

    const onError = async (error: string) => {
      setStreamingContent("")
      setIsStreaming(false)
      if (!error) return // aborted
      const errorCode = mapErrorCode(error)
      setLastFailedInput(text.trim() || null)
      const failedMsg: Message = {
        ...pendingAssistantMessage,
        content: fullContent || `⚠️ ${error}`,
        status: 'failed',
        errorCode,
        errorMessage: error,
      }
      await updateMessage(failedMsg)
      setMessages(prev => prev.map((msg) => msg.id === assistantMessageId ? failedMsg : msg))
    }

    const onToken = async (token: string) => {
      fullContent += token
      setStreamingContent(fullContent)
      const streamingMsg: Message = {
        ...pendingAssistantMessage,
        content: fullContent,
        status: 'streaming',
      }
      setMessages(prev => prev.map((msg) => msg.id === assistantMessageId ? streamingMsg : msg))
    }

    const enabledTools = getEnabledTools(allTools)

    if (agentMode && enabledTools.length > 0 && transportProvider !== 'credits') {
      await streamChatWithTools(model.id, transportProvider, aiMessages, enabledTools, {
        onToken,
        onDone,
        onError,
        onToolCall: (toolName, params) => {
          const tool = getToolById(toolName)
          const callInfo: ToolCallInfo = {
            id: crypto.randomUUID(),
            toolName: tool?.name || toolName,
            toolIcon: tool?.icon || '🔧',
            params,
            status: 'running',
          }
          setActiveToolCalls(prev => [...prev, callInfo])
        },
        onToolResult: (toolName, result) => {
          setActiveToolCalls(prev =>
            prev.map(tc => tc.toolName === (getToolById(toolName)?.name || toolName) && tc.status === 'running'
              ? { ...tc, status: result.success ? 'success' : 'error', result }
              : tc
            )
          )
        },
      }, controller.signal)
    } else {
      await streamChat(model.id, transportProvider, aiMessages, {
        onToken,
        onDone,
        onError,
        onMeta: async (meta) => {
          if (transportProvider === 'free') {
            const usageState: FreeUsageState = {
              count: meta.freeUsed ?? 0,
              date: getTodayDateKey(),
              limit: meta.freeLimit ?? 20,
            }
            setFreeUsage(usageState)
            localStorage.setItem("anychat_free_usage", JSON.stringify(usageState))
            return
          }

          if (transportProvider === 'credits' && typeof meta.creditsRemaining === 'number') {
            const current = await getCreditBalance()
            const next = {
              ...current,
              credits: meta.creditsRemaining,
              updatedAt: new Date().toISOString(),
            }
            await setLocalCreditBalance(next)
            setCreditBalance(next)
          }
        },
      }, controller.signal)
    }
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

  const modelDef = getModelById(selectedModel)
  const modelName = modelDef?.name || "AI"
  const activeTransport = modelDef ? getTransportProvider(modelDef) : "free"

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5 shrink-0 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <ModelSelector
            selectedModel={selectedModel}
            onSelect={(m) => setSelectedModel(m.id)}
            availableProviders={availableProviders}
            creditBalance={creditBalance?.credits ?? 0}
          />
          {/* Agent mode toggle */}
          <button
            onClick={() => setAgentMode(!agentMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
              agentMode
                ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {agentMode ? <Zap className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
            {agentMode ? "Agent" : "Chat"}
          </button>

          <span className="text-[11px] px-2 py-1 rounded-full border border-border/50 text-muted-foreground">
            {activeTransport === 'free' ? '🎁 Free' : activeTransport === 'credits' ? '🪙 Credits' : '🔑 BYOK'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {creditBalance && creditBalance.credits > 0 && (
            <Link href="/credits" className="flex items-center gap-1 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
              🪙 {creditBalance.credits}
            </Link>
          )}
          {sessionCost > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              €{sessionCost.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      {selectedModel === 'free' && (
        <div className="px-4 py-2 border-b border-border/40 bg-emerald-500/5">
          <div className="max-w-2xl mx-auto text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>🎁 Free mode · {Math.max(0, (freeUsage?.limit ?? 20) - (freeUsage?.count ?? 0))}/{freeUsage?.limit ?? 20} messages remaining today</span>
            <Link href="/settings" className="text-emerald-500 hover:underline">
              Add your own API key for unlimited access →
            </Link>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4" ref={scrollRef}>
        <div className="max-w-2xl mx-auto py-4 space-y-4">
          {messages.length === 0 && !streamingContent && (
            <div className="text-center py-12 space-y-6 animate-fade-in">
              <div>
                <p className="text-4xl mb-3">⚡</p>
                <h2 className="text-xl font-semibold">
                  {agentSystemPrompt ? "Agent ready" : "What can I help with?"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Powered by {modelName}
                </p>
              </div>

              {/* Quick-start cards for new users (no keys, no credits) */}
              {availableProviders.size <= 1 && !creditBalance?.credits && (
                <div className="max-w-md mx-auto space-y-3 text-left">
                  <p className="text-xs text-center text-muted-foreground font-medium uppercase tracking-wide">Quick start</p>
                  <button
                    onClick={() => { setSelectedModel("free"); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                      selectedModel === 'free'
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-border'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Gift className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Start chatting free</p>
                      <p className="text-xs text-muted-foreground">{freeUsage ? `${Math.max(0, freeUsage.limit - freeUsage.count)}` : '20'} messages left today · No setup needed</p>
                    </div>
                    {selectedModel === 'free' && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                  </button>

                  <Link
                    href="/settings"
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-border transition-all duration-200"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Key className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Bring your own API key</p>
                      <p className="text-xs text-muted-foreground">Unlimited access · Pay providers directly</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>

                  <Link
                    href="/credits"
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-border transition-all duration-200"
                  >
                    <div className="w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                      <Coins className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Buy credits</p>
                      <p className="text-xs text-muted-foreground">All models, no keys needed · From €5</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                </div>
              )}

              {/* Suggested prompts */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => handleSend(prompt.text)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border transition-all duration-200 active:scale-[0.97]"
                  >
                    <span>{prompt.icon}</span>
                    <span>{prompt.text}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/50 mt-3">
                Click a suggestion or type your question below
              </p>
            </div>
          )}

          {/* Inline key gate */}
          {showKeyGate && (
            <div className="max-w-md mx-auto animate-fade-in">
              <div className="text-center mb-3">
                <p className="text-sm">
                  🔑 To chat with <span className="font-semibold">{showKeyGate.modelName}</span> you need a key.
                </p>
              </div>
              <InlineKeySetup
                provider={showKeyGate.provider}
                onSuccess={() => {
                  const pending = showKeyGate.pendingMessage
                  setShowKeyGate(null)
                  loadKeysAndDefaultModel().then(() => {
                    if (pending) handleSend(pending)
                  })
                }}
                onSkip={() => setShowKeyGate(null)}
              />
              <p className="text-xs text-muted-foreground text-center mt-3">
                Or pick a different model you already have a key for.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm
                  ${msg.role === 'user'
                    ? 'bg-accent-primary text-white rounded-br-md whitespace-pre-wrap'
                    : 'bg-muted/50 border border-border/30 rounded-bl-md prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background/50 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:text-xs [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5'
                  }`}
              >
                {msg.role === 'user' ? msg.content : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                )}
                {msg.role === 'assistant' && (
                  <>
                    {/* HTML previews */}
                    {extractHtmlBlocks(msg.content).map((block, i) => (
                      <HtmlPreview key={i} html={block.html} />
                    ))}
                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-1 border-t border-border/30">
                      <button
                        onClick={() => copyMessage(msg.id, msg.content)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => speak(msg.content, 'nl-NL', getSelectedVoice() || undefined)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Read aloud"
                      >
                        <Volume2 className="h-3 w-3" />
                      </button>
                      <span className="text-[10px] text-muted-foreground">
                        {msg.status === 'streaming' ? 'Streaming…' : msg.status === 'failed' ? 'Failed' : msg.status === 'sent' ? 'Done' : 'Thinking…'}
                        {msg.transport ? ` · ${msg.transport === 'byok' ? 'BYOK' : msg.transport === 'credits' ? 'Credits' : 'Free'}` : ''}
                      </span>
                      {msg.cost !== undefined && msg.cost > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          €{msg.cost.toFixed(4)} · {msg.inputTokens}+{msg.outputTokens} tokens
                        </span>
                      )}
                    </div>
                    {msg.status === 'failed' && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => handleSend(lastFailedInput || undefined)}>
                          Retry
                        </Button>
                        {getErrorActions(msg.errorCode || 'unknown').primaryHref ? (
                          <Link href={getErrorActions(msg.errorCode || 'unknown').primaryHref!} className="text-amber-500 hover:underline">
                            {getErrorActions(msg.errorCode || 'unknown').primaryLabel}
                          </Link>
                        ) : null}
                        {getErrorActions(msg.errorCode || 'unknown').secondaryHref ? (
                          <Link href={getErrorActions(msg.errorCode || 'unknown').secondaryHref!} className="text-muted-foreground hover:underline">
                            {getErrorActions(msg.errorCode || 'unknown').secondaryLabel}
                          </Link>
                        ) : null}
                        {msg.errorMessage && <span className="text-muted-foreground">{msg.errorMessage}</span>}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Streaming content is rendered inside the persisted assistant message above. */}

          {/* Typing indicator */}
          {isStreaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-md bg-muted/50 border border-border/30">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-muted-foreground">{modelName} is thinking...</span>
              </div>
            </div>
          )}

          {/* Tool call visualization */}
          {activeToolCalls.length > 0 && (
            <div className="max-w-[85%]">
              {activeToolCalls.map(tc => (
                <ToolCallDisplay key={tc.id} call={tc} />
              ))}
            </div>
          )}

          {/* Agent mode tool bar */}
          {agentMode && !isStreaming && messages.length === 0 && (
            <div className="flex items-center gap-1.5 justify-center mt-2">
              {getEnabledTools(allTools).map(t => (
                <span key={t.id} className="text-xs px-2 py-1 rounded-full bg-muted/40 border border-border/30" title={t.name}>
                  {t.icon}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-3 shrink-0 bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto">
          <div className="relative flex items-end gap-2 bg-muted/30 border border-border/50 rounded-2xl px-3 py-2 focus-within:border-accent-primary/50 transition-colors duration-200">
            {/* File upload (includes attachment button + previews) */}
            <FileUpload
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              disabled={isStreaming}
            />

            {/* Camera */}
            <CameraButton
              onCapture={(att) => setAttachments(prev => [...prev, att])}
              disabled={isStreaming}
            />

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-h-[36px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-1.5 text-sm"
              rows={1}
            />

            {/* Voice input */}
            <VoiceInput
              onTranscript={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
              disabled={isStreaming}
            />

            {/* Send / Stop */}
            {isStreaming ? (
              <Button size="icon" variant="destructive" onClick={handleStop} className="shrink-0 h-9 w-9 rounded-xl">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={!input.trim() && attachments.length === 0}
                className="shrink-0 h-9 w-9 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>

          {lastFailedInput && !isStreaming && (
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Last message failed to send.</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => handleSend(lastFailedInput)}
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
