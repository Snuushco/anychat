"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAgentById } from "@/lib/agents"
import { getAllKeys } from "@/lib/key-store"
import { InlineKeySetup } from "@/components/inline-key-setup"
import type { Provider } from "@/lib/models"

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const agent = getAgentById(id)
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [availableProviders, setAvailableProviders] = useState<Set<string>>(new Set())

  useEffect(() => {
    getAllKeys().then(keys => {
      const providers = new Set(keys.map(k => k.provider))
      setAvailableProviders(providers)
      // Check if user has at least one key
      setHasKey(providers.size > 0)
    })
  }, [])

  if (!agent) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-muted-foreground">Agent not found</p>
      </div>
    )
  }

  function startChat(prompt?: string) {
    const params = new URLSearchParams({ agent: agent!.id })
    if (prompt) params.set("prompt", prompt)
    router.push(`/chat?${params.toString()}`)
  }

  // Determine a default provider to suggest
  const suggestedProvider: Provider = "openai"

  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className={`relative px-4 py-8 md:px-8 md:py-12 bg-gradient-to-br ${agent.gradient || 'from-accent-primary/10 to-transparent'}`}>
        <button
          onClick={() => router.push("/agents")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="max-w-2xl mx-auto text-center">
          <span className="text-6xl block mb-4">{agent.icon}</span>
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <p className="text-muted-foreground mt-2">{agent.description}</p>
        </div>
      </div>

      <div className="px-4 py-6 md:px-8 max-w-2xl mx-auto space-y-8">
        {/* Examples */}
        {agent.examples.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              What can I do for you?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {agent.examples.map((example) => (
                <button
                  key={example.text}
                  onClick={() => hasKey ? startChat(example.prompt) : undefined}
                  className={`flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50 text-left transition-all duration-200 hover:border-accent-primary/30 hover:scale-[1.02] active:scale-[0.98] ${!hasKey ? 'opacity-60' : ''}`}
                >
                  <span className="text-xl">{example.icon}</span>
                  <span className="text-sm">{example.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Key gate or start button */}
        {hasKey === false ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              To use {agent.name} you need an AI key. Set it up in 30 seconds:
            </p>
            <InlineKeySetup
              provider={suggestedProvider}
              contextLabel={agent.name}
              onSuccess={() => setHasKey(true)}
            />
          </div>
        ) : hasKey === true ? (
          <Button
            onClick={() => startChat()}
            className="w-full h-14 text-base bg-accent-primary hover:bg-accent-primary/90 text-white rounded-2xl animate-subtle-pulse"
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Start conversation
          </Button>
        ) : null}
      </div>
    </div>
  )
}
