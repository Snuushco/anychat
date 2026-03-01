"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Square, Copy, Check, DollarSign, Zap, MessageSquare, ChevronDown, Volume2 } from "lucide-react"
import { ModelSelector } from "./model-selector"
import { streamChat, streamChatWithTools, type ChatMessage as AIChatMessage, type ContentPart } from "@/lib/ai-client"
import { MODELS, calculateCost, getModelById, PROVIDER_INFO } from "@/lib/models"
import { getEnabledTools, ALL_TOOLS, getToolById, getAllToolsWithPlugins, type Tool } from "@/lib/tools"
import { ToolCallDisplay, type ToolCallInfo } from "./tool-call-display"
import {
  createConversation, updateConversation, addMessage as storeMessage,
  getMessages, type Message, type Conversation
} from "@/lib/chat-store"
import { getAllKeys, saveApiKey, validateApiKey } from "@/lib/key-store"
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
}

export function ChatInterface({ conversation, onConversationCreated, onConversationUpdated, agentSystemPrompt }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [selectedModel, setSelectedModel] = useState("gpt-4.1")
  const [availableProviders, setAvailableProviders] = useState<Set<string>>(new Set())
  const [sessionCost, setSessionCost] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [agentMode, setAgentMode] = useState(false)
  const [toolsExpanded, setToolsExpanded] = useState(false)
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallInfo[]>([])
  const [showKeyGate, setShowKeyGate] = useState<{ provider: import("@/lib/models").Provider; modelName: string; pendingMessage: string } | null>(null)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [memoryContext, setMemoryContext] = useState<string>("")
  const [allTools, setAllTools] = useState<Tool[]>(ALL_TOOLS)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("anychat_default_model")
    if (saved) setSelectedModel(saved)
    loadKeys()
    // Load memory context
    getRecentMemories(20).then(memories => {
      setMemoryContext(buildMemoryContext(memories))
    }).catch(() => {})
    // Load plugin tools
    getAllToolsWithPlugins().then(setAllTools).catch(() => {})
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

  async function loadKeys(): Promise<void> {
    const keys = await getAllKeys()
    setAvailableProviders(new Set(keys.map(k => k.provider)))
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  async function handleSend(overrideInput?: string) {
    const text = overrideInput ?? input
    if ((!text.trim() && attachments.length === 0) || isStreaming) return

    const model = getModelById(selectedModel) || MODELS[0]

    // Check if user has key for this provider
    if (!availableProviders.has(model.provider)) {
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
      createdAt: new Date().toISOString(),
    }

    await storeMessage(userMsg)
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setAttachments([])

    const allMsgs = [...messages, userMsg]
    const aiMessages: AIChatMessage[] = []

    // Inject memory context
    if (memoryContext) {
      aiMessages.push({ role: 'system' as const, content: memoryContext })
    }

    // Inject agent system prompt if present
    if (agentSystemPrompt) {
      aiMessages.push({ role: 'user' as const, content: `[System]: ${agentSystemPrompt}` })
      aiMessages.push({ role: 'assistant' as const, content: "Begrepen, ik neem deze rol aan." })
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
          parts.push({ type: 'text', text: `\n\n--- Bestand: ${att.name} ---\n${att.textContent}\n---` })
        }
      }
      aiMessages.push({ role: 'user', content: parts })
    } else {
      aiMessages.push({ role: 'user', content: text.trim() })
    }

    setIsStreaming(true)
    setStreamingContent("")
    setActiveToolCalls([])
    const controller = new AbortController()
    abortRef.current = controller

    let fullContent = ""

    const onDone = async (usage: { inputTokens: number; outputTokens: number }) => {
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

      // Auto-speak if enabled
      if (getAutoSpeak() && fullContent) {
        speak(fullContent, 'nl-NL', getSelectedVoice() || undefined)
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

    const onError = (error: string) => {
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
    }

    const onToken = (token: string) => {
      fullContent += token
      setStreamingContent(fullContent)
    }

    const enabledTools = getEnabledTools(allTools)

    if (agentMode && enabledTools.length > 0) {
      await streamChatWithTools(model.id, model.provider, aiMessages, enabledTools, {
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
      await streamChat(model.id, model.provider, aiMessages, { onToken, onDone, onError }, controller.signal)
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

  const modelName = getModelById(selectedModel)?.name || "AI"

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5 shrink-0 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <ModelSelector
            selectedModel={selectedModel}
            onSelect={(m) => setSelectedModel(m.id)}
            availableProviders={availableProviders}
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
        </div>
        {sessionCost > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            €{sessionCost.toFixed(4)}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4" ref={scrollRef}>
        <div className="max-w-2xl mx-auto py-4 space-y-4">
          {messages.length === 0 && !streamingContent && (
            <div className="text-center py-16 space-y-6 animate-fade-in">
              <div>
                <p className="text-4xl mb-3">⚡</p>
                <h2 className="text-xl font-semibold">Waarmee kan ik helpen?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {agentSystemPrompt ? "Agent staat klaar" : `Powered by ${modelName}`}
                </p>
              </div>

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
                Klik op een suggestie of typ je vraag hieronder
              </p>
            </div>
          )}

          {/* Inline key gate */}
          {showKeyGate && (
            <div className="max-w-md mx-auto animate-fade-in">
              <div className="text-center mb-3">
                <p className="text-sm">
                  🔑 Om met <span className="font-semibold">{showKeyGate.modelName}</span> te chatten heb je een key nodig.
                </p>
              </div>
              <InlineKeySetup
                provider={showKeyGate.provider}
                onSuccess={() => {
                  const pending = showKeyGate.pendingMessage
                  setShowKeyGate(null)
                  loadKeys().then(() => {
                    if (pending) handleSend(pending)
                  })
                }}
                onSkip={() => setShowKeyGate(null)}
              />
              <p className="text-xs text-muted-foreground text-center mt-3">
                Of kies een ander model waarvoor je al een key hebt.
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
                    <div className="flex items-center gap-2 mt-2 pt-1 border-t border-border/30">
                      <button
                        onClick={() => copyMessage(msg.id, msg.content)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => speak(msg.content, 'nl-NL', getSelectedVoice() || undefined)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Voorlezen"
                      >
                        <Volume2 className="h-3 w-3" />
                      </button>
                      {msg.cost !== undefined && msg.cost > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          €{msg.cost.toFixed(4)} · {msg.inputTokens}+{msg.outputTokens} tokens
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted/50 border border-border/30 px-4 py-2.5 text-sm prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background/50 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:text-xs [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                <span className="inline-block w-1.5 h-4 bg-accent-primary/60 animate-pulse ml-0.5 rounded-sm" />
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {isStreaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-md bg-muted/50 border border-border/30">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-muted-foreground">{modelName} is aan het denken...</span>
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
              placeholder="Typ een bericht..."
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
        </div>
      </div>
    </div>
  )
}
