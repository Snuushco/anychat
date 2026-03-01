"use client"

import { useState } from "react"
import { Check, Loader2, ExternalLink, Eye, EyeOff, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveApiKey, validateApiKey } from "@/lib/key-store"
import { PROVIDER_INFO, type Provider } from "@/lib/models"

interface InlineKeySetupProps {
  provider: Provider
  onSuccess?: () => void
  onSkip?: () => void
  compact?: boolean
  contextLabel?: string // e.g. agent name
}

type SetupState = "input" | "validating" | "success" | "error"

export function InlineKeySetup({ provider, onSuccess, onSkip, compact = false, contextLabel }: InlineKeySetupProps) {
  const [key, setKey] = useState("")
  const [state, setState] = useState<SetupState>("input")
  const [showKey, setShowKey] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const info = PROVIDER_INFO[provider]

  async function handleSave() {
    if (!key.trim()) return
    setState("validating")
    setErrorMsg("")

    try {
      const valid = await validateApiKey(provider, key.trim())
      if (valid) {
        await saveApiKey(provider, key.trim())
        setState("success")
        setTimeout(() => onSuccess?.(), 1200)
      } else {
        setState("error")
        setErrorMsg("This key doesn't work. Check if you copied it correctly.")
      }
    } catch {
      setState("error")
      setErrorMsg("Couldn't verify the key. Check your internet connection.")
    }
  }

  if (state === "success") {
    return (
      <div className={`flex flex-col items-center gap-3 ${compact ? 'p-4' : 'p-6'} rounded-2xl bg-green-500/10 border border-green-500/30 animate-fade-in`}>
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center animate-bounce-once">
          <Check className="h-6 w-6 text-green-500" />
        </div>
        <p className="text-sm font-semibold text-green-400">You're all set! 🎉</p>
        <p className="text-xs text-muted-foreground">
          {info.name} is configured. You can start chatting now.
        </p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-4 ${compact ? 'p-4' : 'p-6'} rounded-2xl bg-muted/30 border border-border/50 animate-fade-in`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">{info.icon}</span>
        <div>
          <h3 className="font-semibold text-sm">
            {contextLabel
              ? `${contextLabel} uses ${info.name}`
              : `Set up ${info.name}`}
          </h3>
          <p className="text-xs text-muted-foreground">This takes 30 seconds</p>
        </div>
      </div>

      {/* Steps */}
      {!compact && (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-bold text-accent-primary bg-accent-primary/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <a
                href={info.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-primary hover:underline inline-flex items-center gap-1"
              >
                Go to {info.name} <ExternalLink className="h-3 w-3" />
              </a>
              <p className="text-xs text-muted-foreground">Create a free account if you don't have one yet</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs font-bold text-accent-primary bg-accent-primary/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
            <p className="text-xs text-muted-foreground">Create a new key and copy it</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs font-bold text-accent-primary bg-accent-primary/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">3</span>
            <p className="text-xs text-muted-foreground">Paste the key below</p>
          </div>
        </div>
      )}

      {/* Key input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? "text" : "password"}
            value={key}
            onChange={(e) => { setKey(e.target.value); setState("input"); setErrorMsg("") }}
            placeholder={`Paste your ${info.name} key here...`}
            className="pr-10 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button
          onClick={handleSave}
          disabled={!key.trim() || state === "validating"}
          className="bg-accent-primary hover:bg-accent-primary/90 text-white shrink-0"
        >
          {state === "validating" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>Save <Check className="h-4 w-4 ml-1" /></>
          )}
        </Button>
      </div>

      {/* Error */}
      {state === "error" && (
        <div className="flex items-start gap-2 text-xs text-red-400 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Skip */}
      {onSkip && (
        <button onClick={onSkip} className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors self-center">
          Set up later →
        </button>
      )}
    </div>
  )
}
