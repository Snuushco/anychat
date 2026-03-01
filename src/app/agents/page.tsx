"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AGENTS } from "@/lib/agents"
import { ArrowRight } from "lucide-react"
import { getAllKeys } from "@/lib/key-store"

export default function AgentsPage() {
  const router = useRouter()
  const [hasKeys, setHasKeys] = useState<boolean | null>(null)

  useEffect(() => {
    getAllKeys().then(keys => setHasKeys(keys.length > 0))
  }, [])

  return (
    <div className="min-h-full px-4 py-6 md:px-8 md:py-10 max-w-3xl mx-auto">
      <div className="animate-fade-in mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          🤖 Agents
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Kies een specialist of maak je eigen agent
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
        {AGENTS.map((agent) => (
          <button
            key={agent.id}
            onClick={() => {
              if (agent.id === "custom") {
                router.push("/chat")
              } else {
                router.push(`/agents/${agent.id}`)
              }
            }}
            className="glass-card group flex items-start gap-4 p-4 rounded-2xl border border-border/50 bg-card/50 text-left transition-all duration-300 active:scale-[0.98] hover:border-accent-primary/30 hover:scale-[1.02]"
          >
            <span className="text-3xl shrink-0 mt-0.5">{agent.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{agent.name}</h3>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{agent.description}</p>
              {hasKeys === false && agent.id !== "custom" && (
                <p className="text-[10px] text-accent-primary mt-1">Stel eerst een key in →</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
