"use client"

import { useState, useEffect } from "react"
import { KeyManager } from "@/components/key-manager"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import { User, Key, Palette, Info, Wrench, Brain, Volume2, Trash2, Puzzle, Bell } from "lucide-react"
import Link from "next/link"
import { requestNotificationPermission } from "@/lib/notifications"
import { ALL_TOOLS, getEnabledTools, setEnabledTools } from "@/lib/tools"
import { getAllMemories, deleteMemory, clearAllMemories, type MemoryEntry } from "@/lib/memory"
import { getAutoSpeak, setAutoSpeak, getSelectedVoice, setSelectedVoice, getVoices, isTTSSupported } from "@/lib/tts"

const CATEGORY_COLORS: Record<string, string> = {
  preference: 'bg-blue-500/20 text-blue-400',
  fact: 'bg-green-500/20 text-green-400',
  instruction: 'bg-orange-500/20 text-orange-400',
  context: 'bg-purple-500/20 text-purple-400',
}

export default function SettingsPage() {
  const [userName, setUserName] = useState("")
  const [defaultModel, setDefaultModel] = useState("gpt-4.1")
  const [enabledToolIds, setEnabledToolIds] = useState<string[]>([])
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("")
  const [ttsSupported, setTtsSupported] = useState(false)

  useEffect(() => {
    setUserName(localStorage.getItem("anychat_user_name") || "")
    setDefaultModel(localStorage.getItem("anychat_default_model") || "gpt-4.1")
    setEnabledToolIds(getEnabledTools().map(t => t.id))
    loadMemories()

    // TTS
    setTtsSupported(isTTSSupported())
    setAutoSpeakEnabled(getAutoSpeak())
    setSelectedVoiceName(getSelectedVoice() || "")

    // Voices load async
    const loadVoices = () => {
      const v = getVoices()
      if (v.length > 0) setVoices(v)
    }
    loadVoices()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  async function loadMemories() {
    try {
      const mems = await getAllMemories()
      setMemories(mems.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    } catch {}
  }

  async function handleDeleteMemory(id: string) {
    await deleteMemory(id)
    loadMemories()
  }

  async function handleClearMemories() {
    if (confirm('Weet je zeker dat je alle herinneringen wilt wissen?')) {
      await clearAllMemories()
      setMemories([])
    }
  }

  function saveName(name: string) {
    setUserName(name)
    localStorage.setItem("anychat_user_name", name)
  }

  function saveDefaultModel(model: string) {
    setDefaultModel(model)
    localStorage.setItem("anychat_default_model", model)
  }

  return (
    <div className="min-h-full px-4 py-6 md:px-8 md:py-10 max-w-2xl mx-auto">
      <div className="animate-fade-in mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">⚙️ Instellingen</h1>
      </div>

      <div className="space-y-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
        {/* Profile */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Profiel</h2>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Naam</label>
            <Input
              value={userName}
              onChange={(e) => saveName(e.target.value)}
              placeholder="Jouw naam"
              className="max-w-xs"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">Wordt gebruikt in de begroeting op het dashboard</p>
          </div>
        </section>

        {/* API Keys */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">API Keys</h2>
          </div>
          <KeyManager onKeysChanged={() => {}} />
        </section>

        {/* Model Preferences */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Model Voorkeuren</h2>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Standaard model</label>
            <select
              value={defaultModel}
              onChange={(e) => saveDefaultModel(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="gpt-4.1">GPT-4.1</option>
              <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
              <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
              <option value="gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash</option>
            </select>
          </div>
        </section>

        {/* Agent Tools */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Agent Tools</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Kies welke tools beschikbaar zijn in Agent modus
          </p>
          <div className="space-y-2">
            {ALL_TOOLS.map(tool => (
              <label key={tool.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabledToolIds.includes(tool.id)}
                  onChange={(e) => {
                    const newIds = e.target.checked
                      ? [...enabledToolIds, tool.id]
                      : enabledToolIds.filter(id => id !== tool.id)
                    setEnabledToolIds(newIds)
                    setEnabledTools(newIds)
                  }}
                  className="rounded border-border"
                />
                <span className="text-base">{tool.icon}</span>
                <div>
                  <p className="text-sm font-medium">{tool.name}</p>
                  <p className="text-[11px] text-muted-foreground">{tool.description.slice(0, 60)}...</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Memory */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Geheugen</h2>
              <span className="text-xs text-muted-foreground">({memories.length})</span>
            </div>
            {memories.length > 0 && (
              <button
                onClick={handleClearMemories}
                className="text-xs text-destructive hover:text-destructive/80 transition-colors"
              >
                Wis alles
              </button>
            )}
          </div>
          {memories.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nog geen herinneringen. De AI kan dingen onthouden via de &apos;remember&apos; tool in Agent modus.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {memories.map(mem => (
                <div key={mem.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[mem.category] || 'bg-muted text-muted-foreground'}`}>
                    {mem.category}
                  </span>
                  <p className="text-xs flex-1">{mem.content}</p>
                  <button
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Voice / TTS */}
        {ttsSupported && (
          <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Spraak</h2>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSpeakEnabled}
                  onChange={(e) => {
                    setAutoSpeakEnabled(e.target.checked)
                    setAutoSpeak(e.target.checked)
                  }}
                  className="rounded border-border"
                />
                <div>
                  <p className="text-sm font-medium">Automatisch voorlezen</p>
                  <p className="text-[11px] text-muted-foreground">AI-antwoorden automatisch uitspreken</p>
                </div>
              </label>
              {voices.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Stem</label>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => {
                      setSelectedVoiceName(e.target.value)
                      setSelectedVoice(e.target.value)
                    }}
                    className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Automatisch (Nederlands)</option>
                    {voices.map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Notifications */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Notificaties</h2>
          </div>
          <button
            onClick={async () => {
              const granted = await requestNotificationPermission()
              alert(granted ? 'Notificaties ingeschakeld!' : 'Notificaties geweigerd of niet beschikbaar.')
            }}
            className="px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary text-sm font-medium hover:bg-accent-primary/30 transition-colors"
          >
            Notificaties inschakelen
          </button>
          <p className="text-[11px] text-muted-foreground mt-2">Nodig voor herinneringen wanneer de app op de achtergrond draait.</p>
        </section>

        {/* Plugins */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Puzzle className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Plugins</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Breid AnyChat uit met extra tools en integraties.</p>
          <Link
            href="/plugins"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            <Puzzle className="h-3.5 w-3.5" /> Plugin beheer →
          </Link>
        </section>

        {/* Appearance */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Weergave</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Thema</p>
              <p className="text-xs text-muted-foreground">Kies licht, donker of systeemvoorkeur</p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {/* About */}
        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Over AnyChat</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Versie 0.3.0 — AI Command Centre<br />
            Je API keys verlaten nooit je apparaat. Alles wordt lokaal versleuteld opgeslagen.
          </p>
        </section>
      </div>
    </div>
  )
}
