"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MessageSquare, Search, PenLine, Code, BarChart3, Palette, ChevronRight, Loader2, Settings } from "lucide-react"
import { getConversations, type Conversation } from "@/lib/chat-store"
import { getAllKeys } from "@/lib/key-store"
import { Onboarding } from "@/components/onboarding"

const QUICK_ACTIONS = [
  { icon: MessageSquare, label: "Chat", desc: "Open gesprek", href: "/chat", color: "from-blue-500/20 to-blue-600/5 border-blue-500/20", iconColor: "text-blue-400" },
  { icon: Search, label: "Research", desc: "Zoek & analyseer", href: "/chat?agent=researcher", color: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20", iconColor: "text-emerald-400" },
  { icon: PenLine, label: "Schrijven", desc: "Tekst, email, content", href: "/chat?agent=email-assistant", color: "from-amber-500/20 to-amber-600/5 border-amber-500/20", iconColor: "text-amber-400" },
  { icon: Code, label: "Code", desc: "Programmeren & debug", href: "/chat?prompt=code", color: "from-violet-500/20 to-violet-600/5 border-violet-500/20", iconColor: "text-violet-400" },
  { icon: BarChart3, label: "Analyseer", desc: "Data & documenten", href: "/chat?prompt=analysis", color: "from-rose-500/20 to-rose-600/5 border-rose-500/20", iconColor: "text-rose-400" },
  { icon: Palette, label: "Creatief", desc: "Brainstorm & ideeën", href: "/chat?prompt=creative", color: "from-pink-500/20 to-pink-600/5 border-pink-500/20", iconColor: "text-pink-400" },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return "Goedenacht"
  if (hour < 12) return "Goedemorgen"
  if (hour < 18) return "Goedemiddag"
  return "Goedenavond"
}

export default function HomePage() {
  const [userName, setUserName] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [hasKeys, setHasKeys] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const name = localStorage.getItem("anychat_user_name") || ""
    const onboarded = localStorage.getItem("anychat_onboarded")
    setUserName(name)
    if (!onboarded) setShowOnboarding(true)
    getConversations().then(convs => {
      setConversations(convs.slice(0, 5))
      setLoading(false)
    })
    getAllKeys().then(keys => setHasKeys(keys.length > 0))
  }, [])

  if (showOnboarding) {
    return (
      <Onboarding onComplete={() => {
        setShowOnboarding(false)
        setUserName(localStorage.getItem("anychat_user_name") || "")
        getAllKeys().then(keys => setHasKeys(keys.length > 0))
      }} />
    )
  }

  return (
    <div className="min-h-full px-4 py-6 md:px-8 md:py-10 max-w-3xl mx-auto">
      {/* No keys banner */}
      {!hasKeys && (
        <button
          onClick={() => router.push("/settings")}
          className="w-full mb-4 flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left transition-all hover:bg-amber-500/15 animate-fade-in"
        >
          <Settings className="h-5 w-5 text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">Voeg je eerste AI key toe</p>
            <p className="text-xs text-muted-foreground">Het duurt maar 30 seconden →</p>
          </div>
        </button>
      )}

      {/* Greeting */}
      <div className="animate-fade-in mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {getGreeting()}{userName ? `, ${userName}` : ""} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Wat wil je vandaag doen?
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10 stagger-children">
        {QUICK_ACTIONS.map(({ icon: Icon, label, desc, href, color, iconColor }) => (
          <Link
            key={label}
            href={href}
            className={`glass-card group relative flex flex-col gap-3 p-4 rounded-2xl border bg-gradient-to-br ${color} min-h-[100px] transition-all duration-300 active:scale-[0.98]`}
          >
            <Icon className={`h-6 w-6 ${iconColor} transition-transform duration-300 group-hover:scale-110`} />
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Active Agents Strip */}
      {/* Placeholder for future active agents
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent-primary/10 border border-accent-primary/20">
          <Loader2 className="h-4 w-4 animate-spin text-accent-primary" />
          <span className="text-sm">Research agent bezig...</span>
        </div>
      </div>
      */}

      {/* Recent Conversations */}
      <div className="animate-fade-in" style={{ animationDelay: "350ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recente gesprekken
          </h2>
          {conversations.length > 0 && (
            <Link href="/chat" className="text-xs text-accent-primary hover:underline">
              Alles bekijken
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 rounded-2xl border border-dashed border-border/50">
            <p className="text-muted-foreground text-sm">Nog geen gesprekken</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Start een chat hierboven</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => router.push(`/chat?id=${conv.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors duration-200 text-left group"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title || "Nieuw gesprek"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.updatedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                    {conv.totalCost > 0 && ` · €${conv.totalCost.toFixed(3)}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
