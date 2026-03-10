"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Zap, Clock, DollarSign } from "lucide-react"
import { MODELS, PROVIDER_INFO, type AIModel, type Provider } from "@/lib/models"
import { getModelCreditCost } from "@/lib/credits"
import { useState, useMemo } from "react"

interface ModelSelectorProps {
  selectedModel: string
  onSelect: (model: AIModel) => void
  availableProviders: Set<string>
  creditBalance?: number
}

export function ModelSelector({ selectedModel, onSelect, availableProviders, creditBalance = 0 }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const current = MODELS.find(m => m.id === selectedModel) || MODELS[0]

  const groupedModels = useMemo(() => {
    const groups: { provider: Provider; models: AIModel[] }[] = []
    const seen = new Set<Provider>()
    for (const model of MODELS) {
      if (!seen.has(model.provider)) {
        seen.add(model.provider)
        groups.push({ provider: model.provider, models: MODELS.filter(m => m.provider === model.provider) })
      }
    }
    return groups
  }, [])

  function handleSelect(model: AIModel) {
    onSelect(model)
    setOpen(false)
  }

  const speedIcon = {
    fast: <Zap className="h-3 w-3 text-yellow-500" />,
    medium: <Clock className="h-3 w-3 text-blue-500" />,
    slow: <Clock className="h-3 w-3 text-orange-500" />,
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-sm font-medium">
          <span>{PROVIDER_INFO[current.provider].icon}</span>
          <span>{current.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose an AI model</DialogTitle>
        </DialogHeader>
        <div className="grid gap-1">
          {groupedModels.map(({ provider, models }) => (
            <div key={provider}>
              <div className="flex items-center gap-2 px-3 py-2 mt-2 first:mt-0">
                <span className="text-sm">{PROVIDER_INFO[provider].icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: PROVIDER_INFO[provider].color }}>
                  {PROVIDER_INFO[provider].name}
                </span>
                {!availableProviders.has(provider) && provider !== 'free' && creditBalance <= 0 && (
                  <Badge variant="outline" className="text-[10px] ml-auto">Key or credits required</Badge>
                )}
              </div>
              {models.map((model) => {
                const creditCost = getModelCreditCost(model.id)
                const hasProviderAccess = availableProviders.has(model.provider)
                const isFree = model.provider === 'free'
                const canUseCredits = !isFree && !hasProviderAccess && creditBalance >= creditCost
                const isAvailable = isFree || hasProviderAccess || canUseCredits

                return (
                  <button
                    key={model.id}
                    onClick={() => isAvailable && handleSelect(model)}
                    disabled={!isAvailable}
                    className={`flex items-start gap-3 rounded-lg p-3 pl-8 text-left transition-colors w-full
                      ${model.id === selectedModel ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}
                      ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{model.name}</span>
                        {speedIcon[model.speed]}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                      {!isAvailable && model.provider !== 'free' && (
                        <p className="text-[10px] text-amber-500 mt-0.5">
                          Need key or {creditCost} credits
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <DollarSign className="h-2.5 w-2.5" />
                          ${model.inputCostPer1k}/1K in · ${model.outputCostPer1k}/1K out
                        </span>
                        <span className="text-yellow-500 font-medium">
                          🪙 {creditCost} credit{creditCost !== 1 ? 's' : ''}
                        </span>
                        {canUseCredits && (
                          <span className="text-emerald-500 font-medium">Uses credits</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
