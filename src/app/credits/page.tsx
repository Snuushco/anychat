"use client"

import { useState, useEffect } from "react"
import { Coins, Sparkles, Zap, Crown, Check, Copy, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCreditBalance, refreshCreditBalanceFromServer, CREDIT_PACKAGES, PAYMENT_LINKS, type CreditBalance } from "@/lib/credits"

export default function CreditsPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let mounted = true

    getCreditBalance().then((local) => {
      if (mounted) setBalance(local)
    })

    refreshCreditBalanceFromServer().then((synced) => {
      if (mounted && synced) setBalance(synced)
    })

    return () => {
      mounted = false
    }
  }, [])

  const copyToken = async () => {
    if (!balance) return
    await navigator.clipboard.writeText(balance.userToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openCheckout = (link: string) => {
    if (!balance) return
    // Append user token as client_reference_id
    const url = new URL(link)
    url.searchParams.set('client_reference_id', balance.userToken)
    window.open(url.toString(), '_blank')
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Coins className="h-8 w-8 text-yellow-500" />
            Credits
          </h1>
          <p className="text-muted-foreground">
            Buy credits to use any AI model without your own API keys
          </p>
        </div>

        {/* Balance Card */}
        <Card className="p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-4xl font-bold">{balance?.credits ?? 0} <span className="text-lg text-muted-foreground">credits</span></p>
            </div>
            {balance?.isPro && (
              <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0">
                <Crown className="h-3 w-3 mr-1" /> Pro
              </Badge>
            )}
          </div>
          {/* User Token */}
          <div className="mt-4 pt-4 border-t border-yellow-500/10">
            <p className="text-xs text-muted-foreground mb-1">Your User Token (paste this at checkout)</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-background/50 px-2 py-1 rounded font-mono flex-1 truncate">
                {balance?.userToken || '...'}
              </code>
              <Button variant="ghost" size="sm" onClick={copyToken} className="shrink-0">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </Card>

        {/* Credit Packages */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Buy Credits</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {CREDIT_PACKAGES.map((pkg) => (
              <Card
                key={pkg.id}
                className={`p-6 relative transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer ${
                  pkg.id === 'popular'
                    ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20'
                    : 'hover:border-foreground/20'
                }`}
                onClick={() => openCheckout(pkg.link)}
              >
                {pkg.id === 'popular' && (
                  <Badge className="absolute -top-2.5 right-4 bg-indigo-500 text-white border-0">
                    Most Popular
                  </Badge>
                )}
                {pkg.id === 'best_value' && (
                  <Badge className="absolute -top-2.5 right-4 bg-emerald-500 text-white border-0">
                    Best Value
                  </Badge>
                )}
                <div className="space-y-3">
                  <div>
                    <p className="text-3xl font-bold">€{pkg.price}</p>
                    <p className="text-lg font-semibold text-foreground/80">{pkg.credits.toLocaleString()} credits</p>
                    {'bonus' in pkg && pkg.bonus && (
                      <p className="text-xs text-emerald-500 font-medium">{pkg.bonus}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>≈ {Math.floor(pkg.credits / 1)} Tier 1 messages</p>
                    <p>≈ {Math.floor(pkg.credits / 5)} Tier 3 messages</p>
                    <p>≈ {Math.floor(pkg.credits / 10)} Tier 4 messages</p>
                  </div>
                  <Button className="w-full" variant={pkg.id === 'popular' ? 'default' : 'outline'}>
                    Buy Now <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Pro Plan */}
        <div>
          <h2 className="text-xl font-semibold mb-4">AnyChat Pro</h2>
          <Card className="p-6 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-purple-500" />
                  <h3 className="text-xl font-bold">Pro Plan</h3>
                  <span className="text-2xl font-bold">€9<span className="text-sm font-normal text-muted-foreground">/month</span></span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {[
                    '100 free messages/day (vs 20)',
                    'Cloud sync across devices',
                    'Priority support badge',
                    'Early access to new features',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:opacity-90 shrink-0"
                onClick={() => openCheckout(PAYMENT_LINKS.pro)}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            </div>
          </Card>
        </div>

        {/* Credit Costs Table */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Credit Costs per Model</h2>
          <Card className="p-4">
            <div className="space-y-2 text-sm">
              {[
                { tier: 'Tier 1', cost: '1 credit', models: 'Gemini Flash, Groq Llama, Mistral Small, DeepSeek Chat, GPT-4.1 Nano', color: 'text-emerald-500' },
                { tier: 'Tier 2', cost: '2 credits', models: 'GPT-4.1 Mini, Claude 3.5 Haiku, Grok 3 Mini, Gemini Pro', color: 'text-blue-500' },
                { tier: 'Tier 3', cost: '5 credits', models: 'GPT-4.1, Claude Sonnet 4, Grok 3, Mistral Large, DeepSeek Reasoner', color: 'text-orange-500' },
                { tier: 'Tier 4', cost: '10 credits', models: 'Claude Opus 4, o3-mini', color: 'text-red-500' },
              ].map((t) => (
                <div key={t.tier} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                  <Badge variant="outline" className={`shrink-0 ${t.color}`}>{t.tier}</Badge>
                  <span className="font-medium shrink-0 w-20">{t.cost}</span>
                  <span className="text-muted-foreground">{t.models}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
