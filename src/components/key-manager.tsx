"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Key, Plus, Trash2, CheckCircle, XCircle, Loader2, ExternalLink, Shield } from "lucide-react"
import { saveApiKey, getAllKeys, deleteApiKey, validateApiKey, type StoredKey } from "@/lib/key-store"
import { PROVIDER_INFO, type Provider } from "@/lib/models"

interface KeyManagerProps {
  onKeysChanged?: () => void
}

export function KeyManager({ onKeysChanged }: KeyManagerProps) {
  const [keys, setKeys] = useState<StoredKey[]>([])
  const [addingProvider, setAddingProvider] = useState<Provider | null>(null)
  const [newKey, setNewKey] = useState("")
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<boolean | null>(null)
  const [wizardStep, setWizardStep] = useState(1)

  useEffect(() => {
    loadKeys()
  }, [])

  async function loadKeys() {
    const stored = await getAllKeys()
    setKeys(stored)
  }

  async function handleAddKey() {
    if (!addingProvider || !newKey.trim()) return
    setValidating(true)
    setValidationResult(null)

    const isValid = await validateApiKey(addingProvider, newKey.trim())
    setValidationResult(isValid)

    if (isValid) {
      await saveApiKey(addingProvider, newKey.trim())
      await loadKeys()
      onKeysChanged?.()
      setTimeout(() => {
        resetAddFlow()
      }, 1500)
    }
    setValidating(false)
  }

  async function handleDeleteKey(provider: Provider) {
    await deleteApiKey(provider)
    await loadKeys()
    onKeysChanged?.()
  }

  function resetAddFlow() {
    setAddingProvider(null)
    setNewKey("")
    setValidationResult(null)
    setWizardStep(1)
  }

  const existingProviders = new Set(keys.map(k => k.provider))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-green-500" />
        <p className="text-sm text-muted-foreground">
          Your keys are encrypted on your device. They never leave your phone.
        </p>
      </div>

      {/* Existing keys */}
      {keys.map((key) => {
        const info = PROVIDER_INFO[key.provider]
        return (
          <Card key={key.provider} className="relative">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{info.icon}</span>
                <div>
                  <p className="font-medium">{info.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{key.maskedKey}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={key.isValid ? "default" : "destructive"} className="text-xs">
                  {key.isValid ? "Active" : "Error"}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteKey(key.provider)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Add key dialog */}
      <Dialog open={addingProvider !== null} onOpenChange={(open) => !open && resetAddFlow()}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setWizardStep(0)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add API Key
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          {wizardStep === 0 && (
            <>
              <DialogHeader>
                <DialogTitle>Which AI would you like to add?</DialogTitle>
                <DialogDescription>Choose a provider to set up an API key.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                {(Object.entries(PROVIDER_INFO) as [Provider, typeof PROVIDER_INFO[Provider]][])
                  .filter(([provider]) => provider !== 'free')
                  .map(([provider, info]) => (
                  <Button
                    key={provider}
                    variant="outline"
                    className="h-16 justify-start gap-3 text-left"
                    disabled={existingProviders.has(provider)}
                    onClick={() => { setAddingProvider(provider); setWizardStep(1) }}
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <p className="font-medium">{info.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {existingProviders.has(provider) ? "Already added" : "Set up API key"}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </>
          )}

          {wizardStep === 1 && addingProvider && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {PROVIDER_INFO[addingProvider].icon} {PROVIDER_INFO[addingProvider].name} Key
                </DialogTitle>
                <DialogDescription>Follow these steps to create your API key.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                  <p><strong>Step 1:</strong> Open the {PROVIDER_INFO[addingProvider].name} website</p>
                  <a
                    href={PROVIDER_INFO[addingProvider].keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline"
                  >
                    Open API Keys page <ExternalLink className="h-3 w-3" />
                  </a>
                  <p><strong>Step 2:</strong> Click &quot;Create new key&quot; or &quot;Create API Key&quot;</p>
                  <p><strong>Step 3:</strong> Copy the key and paste it below</p>
                </div>

                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder={`Paste your ${PROVIDER_INFO[addingProvider].name} API key...`}
                    value={newKey}
                    onChange={(e) => { setNewKey(e.target.value); setValidationResult(null) }}
                    className="font-mono"
                  />
                  {validationResult === true && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Key is valid! Safely stored.
                    </p>
                  )}
                  {validationResult === false && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <XCircle className="h-4 w-4" /> Key is invalid. Check and try again.
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleAddKey}
                  disabled={!newKey.trim() || validating}
                  className="w-full"
                >
                  {validating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validating...</>
                  ) : (
                    <><Key className="mr-2 h-4 w-4" /> Save Key</>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  🔒 Your key is encrypted and stored on this device
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
