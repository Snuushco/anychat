"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InlineKeySetup } from "./inline-key-setup"
import type { Provider } from "@/lib/models"

interface OnboardingProps {
  onComplete: () => void
}

const CHOICES: { provider: Provider | "credits"; name: string; subtitle: string; icon: string; badge?: string; prominent?: boolean }[] = [
  { provider: "free", name: "Gratis starten", subtitle: "Direct chatten, geen setup nodig", icon: "🎁", badge: "Snelste start", prominent: true },
  { provider: "credits", name: "Met credits", subtitle: "Premium modellen zonder eigen API key", icon: "🪙", badge: "Aanbevolen" },
  { provider: "openai", name: "Met eigen API key", subtitle: "Gebruik je eigen OpenAI, Claude, Gemini of OpenRouter key", icon: "🔑" },
]

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const router = useRouter()

  function finish(defaultModel: string, nextRoute?: string) {
    localStorage.setItem("anychat_default_model", defaultModel)
    localStorage.setItem("anychat_onboarded", "true")
    if (name.trim()) localStorage.setItem("anychat_user_name", name.trim())
    onComplete()
    if (nextRoute) router.push(nextRoute)
  }

  function handleChoice(provider: Provider | "credits") {
    if (provider === 'free') {
      finish('free')
      return
    }

    if (provider === 'credits') {
      finish('gpt-4.1', '/credits')
      return
    }

    setSelectedProvider('openai')
    setStep(3)
  }

  function handleKeySuccess() {
    finish('gpt-4.1')
  }

  function handleSkip() {
    finish('free')
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
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

        {step === 1 && (
          <div className="space-y-6 animate-fade-in text-center">
            <div>
              <p className="text-5xl mb-4">⚡</p>
              <h1 className="text-2xl font-bold">Start in 30 seconden</h1>
              <p className="text-muted-foreground mt-2">Kies hoe je wilt chatten. Je kunt dit later altijd aanpassen.</p>
            </div>

            <div className="space-y-3 text-left">
              {CHOICES.map(({ provider, name: choiceName, subtitle, icon, badge, prominent }) => (
                <button
                  key={provider}
                  onClick={() => handleChoice(provider)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                    prominent
                      ? "border-2 border-emerald-500/60 bg-emerald-500/10 hover:border-emerald-500"
                      : "border border-border/50 bg-card/50 hover:border-accent-primary/30"
                  }`}
                >
                  <span className="text-3xl">{icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{choiceName}</h3>
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

            <button onClick={() => setStep(2)} className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              Ik beslis later
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in text-center">
            <div>
              <p className="text-5xl mb-4">👋</p>
              <h1 className="text-2xl font-bold">Hoe mogen we je noemen?</h1>
              <p className="text-muted-foreground mt-2">Optioneel. Je kunt dit ook overslaan.</p>
            </div>
            <div className="space-y-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Je naam..."
                className="text-center text-lg h-12"
                onKeyDown={(e) => e.key === "Enter" && handleSkip()}
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleSkip} className="h-12">Overslaan</Button>
                <Button onClick={handleSkip} className="h-12 bg-accent-primary hover:bg-accent-primary/90 text-white">
                  Naar chat <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && selectedProvider && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Voeg je API key toe</h1>
              <p className="text-muted-foreground mt-2">
                Je kunt altijd terugvallen op free of credits als je dit later wilt doen.
              </p>
            </div>

            <InlineKeySetup
              provider={selectedProvider}
              onSuccess={handleKeySuccess}
              onSkip={handleSkip}
            />

            <button
              onClick={() => setStep(1)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors block mx-auto"
            >
              ← Terug naar keuzes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
