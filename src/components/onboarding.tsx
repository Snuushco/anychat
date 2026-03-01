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

const PROVIDERS: { provider: Provider; name: string; subtitle: string; icon: string; badge?: string }[] = [
  { provider: "openai", name: "OpenAI (ChatGPT)", subtitle: "Meest populair", icon: "🟢", badge: "Populair" },
  { provider: "anthropic", name: "Anthropic (Claude)", subtitle: "Beste voor schrijven", icon: "🟤" },
  { provider: "google", name: "Google (Gemini)", subtitle: "Gratis opties", icon: "🔵", badge: "Gratis" },
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
              <h1 className="text-2xl font-bold">Welkom bij AnyChat</h1>
              <p className="text-muted-foreground mt-2">Hoe wil je genoemd worden?</p>
            </div>
            <div className="space-y-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Je naam..."
                className="text-center text-lg h-12"
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                autoFocus
              />
              <Button
                onClick={handleNameSubmit}
                disabled={!name.trim()}
                className="w-full h-12 bg-accent-primary hover:bg-accent-primary/90 text-white text-base"
              >
                Verder <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Choose provider */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Kies je AI</h1>
              <p className="text-muted-foreground mt-2">
                Welke AI wil je gebruiken? Je kunt later meer toevoegen.
              </p>
            </div>
            <div className="space-y-3">
              {PROVIDERS.map(({ provider, name: pName, subtitle, icon, badge }) => (
                <button
                  key={provider}
                  onClick={() => handleProviderSelect(provider)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card/50 text-left transition-all duration-200 hover:border-accent-primary/30 hover:scale-[1.02] active:scale-[0.98]"
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
                Of gebruik <button onClick={() => handleProviderSelect("openrouter")} className="text-accent-primary hover:underline">OpenRouter</button> voor toegang tot alle modellen met 1 key
              </p>
              <button onClick={handleSkip} className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                Later instellen
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Key setup */}
        {step === 3 && selectedProvider && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Bijna klaar!</h1>
              <p className="text-muted-foreground mt-2">
                Nog even je key instellen en je kunt aan de slag.
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
              ← Andere provider kiezen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
