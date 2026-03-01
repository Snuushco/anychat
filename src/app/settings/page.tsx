"use client"

import { useState, useEffect } from "react"
import { KeyManager } from "@/components/key-manager"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import { User, Key, Palette, Info } from "lucide-react"

export default function SettingsPage() {
  const [userName, setUserName] = useState("")
  const [defaultModel, setDefaultModel] = useState("gpt-4.1")

  useEffect(() => {
    setUserName(localStorage.getItem("anychat_user_name") || "")
    setDefaultModel(localStorage.getItem("anychat_default_model") || "gpt-4.1")
  }, [])

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
            Versie 0.2.0 — AI Command Centre<br />
            Je API keys verlaten nooit je apparaat. Alles wordt lokaal versleuteld opgeslagen.
          </p>
        </section>
      </div>
    </div>
  )
}
