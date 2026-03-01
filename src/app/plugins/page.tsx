"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Plus, Power, Trash2, TestTube, Save, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { getPlugins, savePlugin, deletePlugin, BUILTIN_PLUGINS, executePlugin, type Plugin } from "@/lib/plugins"

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [showCreator, setShowCreator] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  // Creator form
  const [cName, setCName] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cIcon, setCIcon] = useState('🔧')
  const [cType, setCType] = useState<'api' | 'function'>('api')
  const [cEndpoint, setCEndpoint] = useState('')
  const [cMethod, setCMethod] = useState<'GET' | 'POST'>('GET')
  const [cCode, setCCode] = useState('')
  const [cToolName, setCToolName] = useState('')
  const [cToolDesc, setCToolDesc] = useState('')
  const [cParams, setCParams] = useState<Array<{ name: string; type: string; desc: string }>>([{ name: '', type: 'string', desc: '' }])

  useEffect(() => { load() }, [])

  async function load() {
    try { setPlugins(await getPlugins()) } catch {}
  }

  async function handleInstall(bp: Plugin) {
    await savePlugin({ ...bp, installed: true, enabled: true, installedAt: new Date().toISOString() })
    load()
  }

  async function handleToggle(p: Plugin) {
    await savePlugin({ ...p, enabled: !p.enabled })
    load()
  }

  async function handleDelete(id: string) {
    await deletePlugin(id)
    load()
  }

  async function handleSaveCustom() {
    if (!cName || !cToolName) return
    const params: Record<string, any> = {
      type: 'object',
      properties: {} as any,
      required: [] as string[],
    }
    cParams.filter(p => p.name).forEach(p => {
      params.properties[p.name] = { type: p.type, description: p.desc }
      ;(params.required as string[]).push(p.name)
    })

    const plugin: Plugin = {
      id: `custom_${Date.now()}`,
      name: cName,
      description: cDesc,
      icon: cIcon,
      version: '1.0.0',
      author: 'Custom',
      type: cType,
      ...(cType === 'api' ? { endpoint: cEndpoint, method: cMethod } : { code: cCode }),
      toolName: cToolName,
      toolDescription: cToolDesc,
      parameters: params,
      installed: true,
      enabled: true,
      installedAt: new Date().toISOString(),
    }

    await savePlugin(plugin)
    setShowCreator(false)
    setCName(''); setCDesc(''); setCToolName(''); setCToolDesc(''); setCEndpoint(''); setCCode('')
    setCParams([{ name: '', type: 'string', desc: '' }])
    load()
  }

  async function handleTest() {
    const testParams: Record<string, any> = {}
    cParams.filter(p => p.name).forEach(p => { testParams[p.name] = `test_${p.name}` })
    const fakePlugin: Plugin = {
      id: 'test', name: cName, description: cDesc, icon: cIcon, version: '1.0.0', author: 'Test',
      type: cType,
      ...(cType === 'api' ? { endpoint: cEndpoint, method: cMethod } : { code: cCode }),
      toolName: cToolName, toolDescription: cToolDesc, parameters: {},
      installed: true, enabled: true,
    }
    const result = await executePlugin(fakePlugin, testParams)
    setTestResult(result.content)
  }

  const installed = plugins.filter(p => p.installed)
  const available = BUILTIN_PLUGINS.filter(bp => !plugins.find(p => p.id === bp.id && p.installed))

  return (
    <div className="min-h-full px-4 py-6 md:px-8 md:py-10 max-w-2xl mx-auto animate-page-in">
      <div className="animate-fade-in mb-6">
        <Link href="/settings" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Settings
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">🧩 Plugins</h1>
      </div>

      {/* Installed */}
      <section className="mb-8 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Installed</h2>
        {installed.length === 0 && <p className="text-sm text-muted-foreground">No plugins installed yet.</p>}
        <div className="space-y-2">
          {installed.map(p => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-3">
              <span className="text-2xl">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">{p.description}</p>
                <p className="text-[10px] text-muted-foreground">Tool: {p.toolName} · {p.author}</p>
              </div>
              <button
                onClick={() => handleToggle(p)}
                className={`p-2 rounded-lg transition-colors ${p.enabled ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground bg-muted/30'}`}
                title={p.enabled ? 'Disable' : 'Enable'}
              >
                <Power className="h-4 w-4" />
              </button>
              {!BUILTIN_PLUGINS.find(bp => bp.id === p.id) && (
                <button onClick={() => handleDelete(p.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Available */}
      <section className="mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Available</h2>
        <div className="space-y-2">
          {available.map(bp => (
            <div key={bp.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-3">
              <span className="text-2xl">{bp.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{bp.name}</p>
                <p className="text-[11px] text-muted-foreground">{bp.description}</p>
              </div>
              <button
                onClick={() => handleInstall(bp)}
                className="px-3 py-1.5 rounded-lg bg-accent-primary/20 text-accent-primary text-xs font-medium hover:bg-accent-primary/30 transition-colors"
              >
                Install
              </button>
            </div>
          ))}

          {/* Custom plugin card */}
          <button
            onClick={() => setShowCreator(!showCreator)}
            className="w-full flex items-center gap-3 rounded-xl border border-dashed border-border/50 bg-card/30 px-4 py-3 hover:border-accent-primary/50 transition-colors"
          >
            <span className="text-2xl">✨</span>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Create your own plugin</p>
              <p className="text-[11px] text-muted-foreground">API call or JavaScript function</p>
            </div>
            {showCreator ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
      </section>

      {/* Plugin Creator */}
      {showCreator && (
        <section className="rounded-2xl border border-border/50 bg-card/50 p-5 animate-fade-in">
          <h2 className="font-semibold text-sm mb-4">✨ New Plugin</h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input value={cIcon} onChange={e => setCIcon(e.target.value)} className="w-16 rounded-lg border border-border/50 bg-background px-3 py-2 text-center text-xl" />
              <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Name" className="flex-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm" />
            </div>
            <input value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder="Description" className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm" />

            <div className="flex gap-2">
              <select value={cType} onChange={e => setCType(e.target.value as any)} className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm">
                <option value="api">API Call</option>
                <option value="function">JavaScript</option>
              </select>
            </div>

            {cType === 'api' ? (
              <div className="flex gap-2">
                <select value={cMethod} onChange={e => setCMethod(e.target.value as any)} className="w-24 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm">
                  <option>GET</option>
                  <option>POST</option>
                </select>
                <input value={cEndpoint} onChange={e => setCEndpoint(e.target.value)} placeholder="https://api.example.com/{param}" className="flex-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm font-mono" />
              </div>
            ) : (
              <textarea value={cCode} onChange={e => setCCode(e.target.value)} placeholder="return { success: true, data: params, display: 'text', content: 'Result: ' + params.input }" rows={4} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm font-mono" />
            )}

            <div className="flex gap-2">
              <input value={cToolName} onChange={e => setCToolName(e.target.value)} placeholder="Tool name (for AI)" className="flex-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm" />
              <input value={cToolDesc} onChange={e => setCToolDesc(e.target.value)} placeholder="Tool description" className="flex-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm" />
            </div>

            {/* Parameters */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Parameters:</p>
              {cParams.map((p, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <input value={p.name} onChange={e => { const n = [...cParams]; n[i].name = e.target.value; setCParams(n) }} placeholder="name" className="w-28 rounded-lg border border-border/50 bg-background px-2 py-1.5 text-xs" />
                  <select value={p.type} onChange={e => { const n = [...cParams]; n[i].type = e.target.value; setCParams(n) }} className="w-24 rounded-lg border border-border/50 bg-background px-2 py-1.5 text-xs">
                    <option>string</option>
                    <option>number</option>
                    <option>boolean</option>
                  </select>
                  <input value={p.desc} onChange={e => { const n = [...cParams]; n[i].desc = e.target.value; setCParams(n) }} placeholder="description" className="flex-1 rounded-lg border border-border/50 bg-background px-2 py-1.5 text-xs" />
                </div>
              ))}
              <button onClick={() => setCParams([...cParams, { name: '', type: 'string', desc: '' }])} className="text-xs text-accent-primary hover:underline mt-1">+ Parameter</button>
            </div>

            {testResult && (
              <pre className="text-xs bg-muted/30 rounded-lg p-3 overflow-x-auto max-h-32">{testResult}</pre>
            )}

            <div className="flex gap-2">
              <button onClick={handleTest} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm hover:bg-muted/80 transition-colors">
                <TestTube className="h-3.5 w-3.5" /> Test
              </button>
              <button onClick={handleSaveCustom} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-primary text-white text-sm hover:bg-accent-primary/90 transition-colors">
                <Save className="h-3.5 w-3.5" /> Save
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
