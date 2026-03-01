"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronRight, Check, X, Plus, Minus } from "lucide-react"

/* ─── Intersection Observer hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function Section({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useInView()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ─── FAQ Accordion ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button onClick={() => setOpen(!open)} className="w-full text-left border-b border-white/10 py-5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-lg">{q}</span>
        {open ? <Minus className="h-5 w-5 text-indigo-400 shrink-0" /> : <Plus className="h-5 w-5 text-indigo-400 shrink-0" />}
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 mt-3" : "max-h-0"}`}>
        <p className="text-gray-400 leading-relaxed">{a}</p>
      </div>
    </button>
  )
}

/* ─── Model card data ─── */
const MODELS = [
  { name: "GPT-4o", provider: "OpenAI", icon: "🟢", price: "~€0.01/msg" },
  { name: "Claude 3.5", provider: "Anthropic", icon: "🟤", price: "~€0.01/msg" },
  { name: "Gemini Pro", provider: "Google", icon: "🔵", price: "Gratis tier" },
  { name: "Grok", provider: "xAI", icon: "⚡", price: "~€0.01/msg" },
  { name: "DeepSeek V3", provider: "DeepSeek", icon: "🔮", price: "~€0.002/msg" },
  { name: "Mistral Large", provider: "Mistral", icon: "🟠", price: "~€0.008/msg" },
  { name: "Llama 3.1", provider: "Meta (via OR)", icon: "🦙", price: "~€0.003/msg" },
  { name: "Command R+", provider: "Cohere", icon: "🔴", price: "~€0.005/msg" },
  { name: "Qwen 2.5", provider: "Alibaba (via OR)", icon: "🟣", price: "~€0.002/msg" },
  { name: "OpenRouter", provider: "200+ modellen", icon: "🌐", price: "Varies" },
]

const FEATURES = [
  { emoji: "🤖", title: "10+ AI Modellen", desc: "GPT-4, Claude, Gemini, Grok, DeepSeek, Mistral en meer. Switch wanneer je wilt." },
  { emoji: "🔧", title: "Tools & Agents", desc: "Web search, code uitvoering, berekeningen. Je AI doet het werk." },
  { emoji: "🔒", title: "100% Privacy", desc: "Je keys blijven op je apparaat. Wij zien niks, slaan niks op." },
  { emoji: "📱", title: "Mobile-First", desc: "Installeerbaar als app. Push notificaties. Camera & voice." },
  { emoji: "🧠", title: "Geheugen", desc: "Je AI onthoudt je voorkeuren en context. Elke sessie wordt slimmer." },
  { emoji: "🔌", title: "Plugins", desc: "Weer, QR codes, vertalingen. Of maak je eigen tools." },
]

const FAQ = [
  { q: "Wat is een API key?", a: "Een API key is een soort wachtwoord dat je krijgt van een AI-provider (zoals OpenAI). Hiermee betaal je direct aan de provider — zonder tussenpersoon. Je maakt er eentje aan op hun website, kost 2 minuten." },
  { q: "Is het veilig?", a: "Ja. Je keys worden versleuteld opgeslagen op je eigen apparaat en verlaten nooit je telefoon. AnyChat stuurt je berichten rechtstreeks naar de AI-provider. Wij kunnen je data niet zien, zelfs als we zouden willen." },
  { q: "Wat kost het?", a: "Het platform is 100% gratis. Je betaalt alleen voor wat je daadwerkelijk gebruikt aan de AI-provider. Gemiddeld is dat €2-5 per maand bij normaal gebruik — een fractie van ChatGPT Plus (€20/mnd)." },
  { q: "Werkt het op mijn telefoon?", a: "Ja! AnyChat is een PWA (Progressive Web App) en werkt in elke moderne browser op iOS, Android en desktop. Geen App Store nodig." },
  { q: "Kan ik het als app installeren?", a: "Absoluut. Open AnyChat in je browser, tik op 'Deel' → 'Zet op beginscherm' (iOS) of het installatie-icoontje (Android/Chrome). Je krijgt een volwaardige app-ervaring." },
]

export default function LandingPage() {
  const router = useRouter()

  // Auto-redirect onboarded users
  useEffect(() => {
    if (localStorage.getItem("anychat_onboarded")) {
      router.replace("/dashboard")
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-x-hidden">
      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="text-2xl">⚡</span> AnyChat
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
              Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-full bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/25"
            >
              Open App →
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        {/* Animated gradient bg */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-[spin_20s_linear_infinite] opacity-30">
            <div className="absolute top-1/2 left-1/2 w-96 h-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600 blur-[128px]" />
            <div className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full bg-violet-600 blur-[100px]" />
            <div className="absolute top-2/3 left-2/3 w-64 h-64 rounded-full bg-blue-600 blur-[100px]" />
          </div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <Section>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
              Jouw AI.<br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Jouw regels.
              </span><br />
              Jouw data.
            </h1>
          </Section>
          <Section delay={150}>
            <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              De krachtigste AI assistant op je telefoon. Gebruik je eigen keys,
              betaal alleen wat je gebruikt, en houd volledige controle.
            </p>
          </Section>
          <Section delay={300}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="px-8 py-4 rounded-full bg-indigo-500 hover:bg-indigo-400 text-lg font-bold transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95"
              >
                Start Gratis →
              </Link>
              <button
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                className="px-8 py-4 rounded-full border border-white/20 hover:border-white/40 text-lg font-medium transition-all hover:bg-white/5"
              >
                Bekijk demo ↓
              </button>
            </div>
          </Section>
          <Section delay={500}>
            <div className="mt-16 animate-bounce">
              <ChevronDown className="h-6 w-6 text-gray-500 mx-auto" />
            </div>
          </Section>
        </div>
      </section>

      {/* ═══ STATS STRIP ═══ */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { num: "10+", label: "AI modellen" },
            { num: "6", label: "Ingebouwde tools" },
            { num: "100%", label: "Privacy" },
            { num: "€0", label: "Platform kosten" },
          ].map((s, i) => (
            <Section key={i} delay={i * 100}>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  {s.num}
                </div>
                <div className="text-sm text-gray-400 mt-1">{s.label}</div>
              </div>
            </Section>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <Section>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
              Alles wat je nodig hebt
            </h2>
            <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
              Eén app, alle AI-modellen, alle tools. Geen beperkingen.
            </p>
          </Section>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <Section key={i} delay={i * 80}>
                <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 hover:border-indigo-500/30 group">
                  <div className="text-4xl mb-4">{f.emoji}</div>
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-24 px-4 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <Section>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-16">
              In 3 stappen aan de slag
            </h2>
          </Section>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", icon: "👤", title: "Maak een gratis account", desc: "Geen creditcard, geen gedoe. Open de app en vul je naam in." },
              { step: "2", icon: "🔑", title: "Voeg je API key toe", desc: "Pak een key van OpenAI, Google of een andere provider. Duurt 2 minuten." },
              { step: "3", icon: "🚀", title: "Start met chatten", desc: "Kies je model, stel je vraag, en laat AI het werk doen." },
            ].map((s, i) => (
              <Section key={i} delay={i * 150}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-3xl mx-auto mb-4">
                    {s.icon}
                  </div>
                  <div className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-2">Stap {s.step}</div>
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm">{s.desc}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING COMPARISON ═══ */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <Section>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
              Bespaar tot 80%
            </h2>
            <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
              Waarom €20/maand betalen als het ook anders kan?
            </p>
          </Section>
          <div className="grid md:grid-cols-2 gap-6">
            {/* ChatGPT Plus */}
            <Section>
              <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-4">ChatGPT Plus</div>
                <div className="text-4xl font-extrabold mb-1">€20<span className="text-lg text-gray-500 font-normal">/mnd</span></div>
                <div className="text-sm text-gray-500 mb-6">Vast bedrag</div>
                <div className="space-y-3 text-sm">
                  {["1 AI model (GPT-4)", "Beperkt aantal berichten", "Geen tools/plugins", "Data bij OpenAI"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-400">
                      <X className="h-4 w-4 text-red-400 shrink-0" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* AnyChat */}
            <Section delay={100}>
              <div className="p-8 rounded-2xl border-2 border-indigo-500/50 bg-indigo-500/[0.08] relative">
                <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-indigo-500 text-xs font-bold">
                  Aanbevolen
                </div>
                <div className="text-sm text-indigo-400 font-semibold uppercase tracking-wider mb-4">AnyChat</div>
                <div className="text-4xl font-extrabold mb-1">€0<span className="text-lg text-gray-500 font-normal"> platform</span></div>
                <div className="text-sm text-gray-400 mb-1">+ ~€2-5/mnd gebruik</div>
                <div className="text-xs text-indigo-400 mb-6">Betaal alleen wat je gebruikt</div>
                <div className="space-y-3 text-sm">
                  {["10+ AI modellen", "Onbeperkte berichten", "6 ingebouwde tools", "Data op je eigen apparaat"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          </div>
        </div>
      </section>

      {/* ═══ MODEL SHOWCASE ═══ */}
      <section className="py-24 px-4 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <Section>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
              Alle modellen, één app
            </h2>
            <p className="text-gray-400 text-center mb-12">
              Gebruik ze allemaal, of kies je favoriet.
            </p>
          </Section>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
            {MODELS.map((m, i) => (
              <Section key={i} delay={i * 50}>
                <div className="snap-start shrink-0 w-44 p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-indigo-500/30 transition-all">
                  <div className="text-3xl mb-3">{m.icon}</div>
                  <div className="font-bold text-sm">{m.name}</div>
                  <div className="text-xs text-gray-500">{m.provider}</div>
                  <div className="text-xs text-indigo-400 mt-2 font-medium">{m.price}</div>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <Section>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-12">
              Veelgestelde vragen
            </h2>
          </Section>
          <Section delay={100}>
            <div>
              {FAQ.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-32 px-4 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[128px]" />
        </div>
        <div className="relative z-10 text-center max-w-xl mx-auto">
          <Section>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
              Klaar om te starten?
            </h2>
            <p className="text-gray-400 text-lg mb-10">
              Geen account nodig. Geen creditcard. Start in 30 seconden.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-10 py-5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-xl font-bold transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95"
            >
              Open AnyChat →
            </Link>
          </Section>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/10 py-8 px-4 text-center text-sm text-gray-500">
        <p>⚡ AnyChat — AI Command Centre</p>
        <p className="mt-1">Open source · Privacy-first · Gratis</p>
      </footer>
    </div>
  )
}
