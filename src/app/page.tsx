"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MessageSquare, Zap, Shield, DollarSign, ArrowRight, Menu } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="font-bold text-xl">💬 AnyChat</span>
        <Link href="/chat">
          <Button size="sm">Start Chatten</Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Al je AI modellen.{" "}
          <span className="text-primary">Eén simpele app.</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          Chat met GPT-4o, Claude en Gemini vanuit één plek.
          Gebruik je eigen API keys en bespaar tot 10x op AI kosten.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/chat">
            <Button size="lg" className="gap-2 w-full sm:w-auto">
              Start gratis chatten <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Geen account nodig · Gratis te gebruiken met eigen API keys
        </p>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<DollarSign className="h-8 w-8 text-green-500" />}
            title="Bespaar tot 10x"
            description="Betaal alleen wat je gebruikt. Geen dure subscriptions meer van €20/maand."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-yellow-500" />}
            title="Alle AI modellen"
            description="GPT-4o, Claude, Gemini — switch in één tik. Altijd het beste model voor de taak."
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-blue-500" />}
            title="100% Privacy"
            description="Je API keys verlaten nooit je apparaat. Encrypted opgeslagen, zero-knowledge server."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 bg-muted/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Zo simpel werkt het</h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <Step number={1} title="Open AnyChat" desc="Direct in je browser, installeerbaar als app." />
            <Step number={2} title="Voeg je API key toe" desc="Stap-voor-stap wizard. Klaar in 2 minuten." />
            <Step number={3} title="Start met chatten" desc="WhatsApp-achtige interface. Simpel en snel." />
          </div>
        </div>
      </section>

      {/* Cost comparison */}
      <section className="px-6 py-16 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Waarom BYOK?</h2>
        <p className="text-muted-foreground mb-8">
          BYOK = Bring Your Own Key. Je gebruikt je eigen API key, dus je betaalt alleen wat je daadwerkelijk gebruikt.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
          <div className="rounded-xl border p-6 text-center">
            <p className="text-sm text-muted-foreground">ChatGPT Plus</p>
            <p className="text-3xl font-bold mt-1">€20<span className="text-sm font-normal">/maand</span></p>
            <p className="text-xs text-muted-foreground mt-2">Vast bedrag, of je het nu gebruikt of niet</p>
          </div>
          <div className="rounded-xl border-2 border-primary p-6 text-center relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              AnyChat
            </span>
            <p className="text-sm text-muted-foreground">Met eigen API key</p>
            <p className="text-3xl font-bold mt-1">€2-5<span className="text-sm font-normal">/maand</span></p>
            <p className="text-xs text-muted-foreground mt-2">Gemiddeld gebruik · Betaal per bericht</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        <p>💬 AnyChat — Al je AI modellen in één app</p>
        <p className="mt-1">Je API keys zijn veilig. Ze verlaten nooit je apparaat.</p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center space-y-3">
      <div className="flex justify-center">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function Step({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
        {number}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}
