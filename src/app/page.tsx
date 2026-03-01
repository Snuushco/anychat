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
  { name: "GPT-4o", provider: "OpenAI", icon: "🟢", price: "~$0.01/msg" },
  { name: "Claude 3.5", provider: "Anthropic", icon: "🟤", price: "~$0.01/msg" },
  { name: "Gemini Pro", provider: "Google", icon: "🔵", price: "Free tier" },
  { name: "Grok", provider: "xAI", icon: "⚡", price: "~$0.01/msg" },
  { name: "DeepSeek V3", provider: "DeepSeek", icon: "🔮", price: "~$0.002/msg" },
  { name: "Mistral Large", provider: "Mistral", icon: "🟠", price: "~$0.008/msg" },
  { name: "Llama 3.1", provider: "Meta (via OR)", icon: "🦙", price: "~$0.003/msg" },
  { name: "Command R+", provider: "Cohere", icon: "🔴", price: "~$0.005/msg" },
  { name: "Qwen 2.5", provider: "Alibaba (via OR)", icon: "🟣", price: "~$0.002/msg" },
  { name: "OpenRouter", provider: "200+ models", icon: "🌐", price: "Varies" },
]

const FEATURES = [
  { emoji: "🤖", title: "10+ AI Models", desc: "GPT-4, Claude, Gemini, Grok, DeepSeek, Mistral and more. Switch anytime." },
  { emoji: "🔧", title: "Tools & Agents", desc: "Web search, code execution, calculations. Your AI does the heavy lifting." },
  { emoji: "🔒", title: "100% Privacy", desc: "Your keys stay on your device. We see nothing, store nothing." },
  { emoji: "📱", title: "Mobile-First", desc: "Installable as an app. Push notifications. Camera & voice." },
  { emoji: "🧠", title: "Memory", desc: "Your AI remembers your preferences and context. Every session gets smarter." },
  { emoji: "🔌", title: "Plugins", desc: "Weather, QR codes, translations. Or build your own tools." },
]

const FAQ = [
  { q: "What is an API key?", a: "An API key is like a password you get from an AI provider (like OpenAI). It lets you pay the provider directly — no middleman. You create one on their website, takes 2 minutes." },
  { q: "Is it safe?", a: "Yes. Your keys are encrypted on your own device and never leave your phone. AnyChat sends your messages directly to the AI provider. We can't see your data, even if we wanted to." },
  { q: "How much does it cost?", a: "The platform is 100% free. You only pay for what you actually use at the AI provider. On average that's $2-5 per month with normal use — a fraction of ChatGPT Plus ($20/mo)." },
  { q: "Does it work on my phone?", a: "Yes! AnyChat is a PWA (Progressive Web App) and works in any modern browser on iOS, Android and desktop. No App Store needed." },
  { q: "Can I install it as an app?", a: "Absolutely. Open AnyChat in your browser, tap 'Share' → 'Add to Home Screen' (iOS) or the install icon (Android/Chrome). You get a full app experience." },
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
              Start chatting for free.<br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                No account, no credit card,
              </span><br />
              no API key.
            </h1>
          </Section>
          <Section delay={150}>
            <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Jump in instantly with AnyChat Free, or bring your own keys for unlimited power.
              Pay only for what you use and stay in full control.
            </p>
          </Section>
          <Section delay={300}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="px-8 py-4 rounded-full bg-indigo-500 hover:bg-indigo-400 text-lg font-bold transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95"
              >
                Get Started Free →
              </Link>
              <button
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                className="px-8 py-4 rounded-full border border-white/20 hover:border-white/40 text-lg font-medium transition-all hover:bg-white/5"
              >
                See how it works ↓
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
            { num: "10+", label: "AI models" },
            { num: "6", label: "Built-in tools" },
            { num: "100%", label: "Privacy" },
            { num: "$0", label: "Platform cost" },
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
              Everything you need
            </h2>
            <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
              One app, all AI models, all tools. No limits.
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
              Get started in 3 steps
            </h2>
          </Section>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", icon: "👤", title: "Create a free account", desc: "No credit card, no hassle. Open the app and enter your name." },
              { step: "2", icon: "🔑", title: "Add your API key", desc: "Grab a key from OpenAI, Google or another provider. Takes 2 minutes." },
              { step: "3", icon: "🚀", title: "Start chatting", desc: "Pick your model, ask your question, and let AI do the work." },
            ].map((s, i) => (
              <Section key={i} delay={i * 150}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-3xl mx-auto mb-4">
                    {s.icon}
                  </div>
                  <div className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-2">Step {s.step}</div>
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
              Save up to 80%
            </h2>
            <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
              Why pay $20/month when there's a better way?
            </p>
          </Section>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <Section>
              <div className="p-8 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/[0.08] relative">
                <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-emerald-500 text-xs font-bold text-black">
                  New
                </div>
                <div className="text-sm text-emerald-400 font-semibold uppercase tracking-wider mb-4">AnyChat Free</div>
                <div className="text-4xl font-extrabold mb-1">$0<span className="text-lg text-gray-500 font-normal"> forever</span></div>
                <div className="text-sm text-gray-400 mb-1">No setup required</div>
                <div className="text-xs text-emerald-400 mb-6">20 messages/day included</div>
                <div className="space-y-3 text-sm">
                  {["No account needed", "No API key needed", "Gemini Flash powered", "Upgrade anytime with your own key"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* ChatGPT Plus */}
            <Section delay={80}>
              <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-4">ChatGPT Plus</div>
                <div className="text-4xl font-extrabold mb-1">$20<span className="text-lg text-gray-500 font-normal">/mo</span></div>
                <div className="text-sm text-gray-500 mb-6">Fixed price</div>
                <div className="space-y-3 text-sm">
                  {["1 AI model (GPT-4)", "Limited messages", "No tools/plugins", "Data stored by OpenAI"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-400">
                      <X className="h-4 w-4 text-red-400 shrink-0" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* AnyChat Pro BYOK */}
            <Section delay={120}>
              <div className="p-8 rounded-2xl border-2 border-indigo-500/50 bg-indigo-500/[0.08] relative">
                <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-indigo-500 text-xs font-bold">
                  Recommended
                </div>
                <div className="text-sm text-indigo-400 font-semibold uppercase tracking-wider mb-4">AnyChat BYOK</div>
                <div className="text-4xl font-extrabold mb-1">$0<span className="text-lg text-gray-500 font-normal"> platform</span></div>
                <div className="text-sm text-gray-400 mb-1">+ ~$2-5/mo usage</div>
                <div className="text-xs text-indigo-400 mb-6">Pay only for what you use</div>
                <div className="space-y-3 text-sm">
                  {["10+ AI models", "Unlimited messages", "6 built-in tools", "Data stays on your device"].map((item, i) => (
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
              All models, one app
            </h2>
            <p className="text-gray-400 text-center mb-12">
              Use them all, or pick your favorite.
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
              Frequently asked questions
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
              Ready to get started?
            </h2>
            <p className="text-gray-400 text-lg mb-10">
              No account needed. No credit card. Start in 30 seconds.
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
        <p className="mt-1">Open source · Privacy-first · Free</p>
      </footer>
    </div>
  )
}
