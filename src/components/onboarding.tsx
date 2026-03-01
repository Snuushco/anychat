"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InlineKeySetup } from "./inline-key-setup"
import type { Provider } from "@/lib/models"

interface OnboardingProps {
  onComplete: () => void
}

const PROVIDERS: { provider: Provider; name: string; subtitle: string; icon: string; badge?: string; prominent?: boolean }[] = [
  { provider: "free", name: "Start free — No API key needed", subtitle: "20 messages/day with Gemini Flash", icon: "🎁", badge: "Recommended", prominent: true },
  { provider: "openai", name: "OpenAI (ChatGPT)", subtitle: "Most popular", icon: "🟢", badge: "Popular" },
  { provider: "anthropic", name: "Anthropic (Claude)", subtitle: "Best for writing", icon: "🟤" },
  { provider: "google", name: "Google (Gemini)", subtitle: "Great value", icon: "🔵" },
]

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

  function handleNameSubmit() {
    if (name.trim()) {
      localStorage.setItem("anychat_user_name", name.trim())
      setStep(2)
    }
  }

  function handleProviderSelect(provider: Provider) {
    if (provider === 'free') {
      localStorage.setItem("anychat_default_model", "free")
      localStorage.setItem("anychat_onboarded", "true")
      if (name.trim()) localStorage.setItem("anychat_user_name", name.trim())
      onComplete()
      return
    }

    setSelectedProvider(provider)
    setStep(3)
  }

  function handleKeySuccess() {
    localStorage.setItem("anychat_onboarded", "true")
    setTimeout(onComplete, 500)
  }

  function handleSkip() {
    localStorage.setItem("anychat_onboarded", "true")
    if (name.trim()) localStorage.setItem("anychat_user_name", name.trim())
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                s === step ? "bg-accent-primary w-6" : s < step ? "bg-accent-primary/50" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in text-center">
            <div>
              <p className="text-5xl mb-4">👋</p>
              <h1 className="text-2xl font-bold">Welcome to AnyChat</h1>
              <p className="text-muted-foreground mt-2">What should we call you?</p>
            </div>
            <div className="space-y-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name..."
                className="text-center text-lg h-12"
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                autoFocus
              />
              <Button
                onClick={handleNameSubmit}
                disabled={!name.trim()}
                className="w-full h-12 bg-accent-primary hover:bg-accent-primary/90 text-white text-base"
              >
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Choose provider */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Choose your AI</h1>
              <p className="text-muted-foreground mt-2">
                Which AI do you want to use? You can add more later.
              </p>
            </div>
            <div className="space-y-3">
              {PROVIDERS.map(({ provider, name: pName, subtitle, icon, badge, prominent }) => (
                <button
                  key={provider}
                  onClick={() => handleProviderSelect(provider)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                    prominent
                      ? "border-2 border-emerald-500/60 bg-emerald-500/10 hover:border-emerald-500"
                      : "border border-border/50 bg-card/50 hover:border-accent-primary/30"
                  }`}
                >
                  <span className="text-3xl">{icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{pName}</h3>
                      {badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary font-medium">
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>

            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Or use <button onClick={() => handleProviderSelect("openrouter")} className="text-accent-primary hover:underline">OpenRouter</button> for access to all models with 1 key
              </p>
              <button onClick={handleSkip} className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                Set up later
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Key setup */}
        {step === 3 && selectedProvider && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Almost there!</h1>
              <p className="text-muted-foreground mt-2">
                Just set up your key and you're good to go.
              </p>
            </div>

            <InlineKeySetup
              provider={selectedProvider}
              onSuccess={handleKeySuccess}
              onSkip={handleSkip}
            />

            <button
              onClick={() => setStep(2)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors block mx-auto"
            >
              ← Choose another provider
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
