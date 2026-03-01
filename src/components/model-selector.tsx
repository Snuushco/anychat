"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Zap, Clock, DollarSign } from "lucide-react"
import { MODELS, PROVIDER_INFO, type AIModel } from "@/lib/models"
import { useState } from "react"

interface ModelSelectorProps {
  selectedModel: string
  onSelect: (model: AIModel) => void
  availableProviders: Set<string>
}

export function ModelSelector({ selectedModel, onSelect, availableProviders }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const current = MODELS.find(m => m.id === selectedModel) || MODELS[0]

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kies een AI model</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          {MODELS.map((model) => {
            const isAvailable = availableProviders.has(model.provider)
            return (
              <button
                key={model.id}
                onClick={() => isAvailable && handleSelect(model)}
                disabled={!isAvailable}
                className={`flex items-start gap-3 rounded-lg p-3 text-left transition-colors
                  ${model.id === selectedModel ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}
                  ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span className="text-xl mt-0.5">{PROVIDER_INFO[model.provider].icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{model.name}</span>
                    {speedIcon[model.speed]}
                    {!isAvailable && <Badge variant="outline" className="text-[10px]">Key nodig</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <DollarSign className="h-2.5 w-2.5" />
                    ${model.inputCostPer1k}/1K in · ${model.outputCostPer1k}/1K out
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
