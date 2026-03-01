// Plugin system for AnyChat

import type { Tool, ToolResult } from './tools'

export interface Plugin {
  id: string
  name: string
  description: string
  icon: string
  version: string
  author: string
  type: 'api' | 'function'
  endpoint?: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  code?: string
  toolName: string
  toolDescription: string
  parameters: Record<string, any>
  installed: boolean
  enabled: boolean
  installedAt?: string
}

const DB_NAME = 'anychat_db'
const DB_VERSION = 2
const STORE = 'anychat_plugins'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains('anychat_tasks')) db.createObjectStore('anychat_tasks', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('anychat_reminders')) db.createObjectStore('anychat_reminders', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbOp<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const s = tx.objectStore(STORE)
    const r = fn(s)
    r.onsuccess = () => resolve(r.result as T)
    r.onerror = () => reject(r.error)
  })
}

export async function getPlugins(): Promise<Plugin[]> {
  return dbOp<Plugin[]>('readonly', s => s.getAll())
}

export async function savePlugin(p: Plugin): Promise<void> {
  await dbOp('readwrite', s => s.put(p))
}

export async function deletePlugin(id: string): Promise<void> {
  await dbOp('readwrite', s => s.delete(id))
}

// ── Built-in plugins ──

export const BUILTIN_PLUGINS: Plugin[] = [
  {
    id: 'weather',
    name: 'Weer',
    description: 'Haal het huidige weer op voor een stad via wttr.in',
    icon: '🌤️',
    version: '1.0.0',
    author: 'AnyChat',
    type: 'api',
    endpoint: 'https://wttr.in/{city}?format=j1',
    method: 'GET',
    toolName: 'weather',
    toolDescription: 'Get current weather for a city. Returns temperature, conditions, humidity, wind.',
    parameters: {
      type: 'object',
      properties: { city: { type: 'string', description: 'City name, e.g. "Amsterdam"' } },
      required: ['city'],
    },
    installed: false,
    enabled: false,
  },
  {
    id: 'qr_code',
    name: 'QR Code',
    description: 'Genereer een QR code afbeelding van tekst of URL',
    icon: '📱',
    version: '1.0.0',
    author: 'AnyChat',
    type: 'api',
    endpoint: 'https://api.qrserver.com/v1/create-qr-code/?data={text}&size=200x200',
    method: 'GET',
    toolName: 'qr_code',
    toolDescription: 'Generate a QR code image from text or URL. Returns the image URL.',
    parameters: {
      type: 'object',
      properties: { text: { type: 'string', description: 'Text or URL to encode' } },
      required: ['text'],
    },
    installed: false,
    enabled: false,
  },
  {
    id: 'translator',
    name: 'Vertaler',
    description: 'Vertaal tekst naar een andere taal (gebruikt het AI model zelf)',
    icon: '🌍',
    version: '1.0.0',
    author: 'AnyChat',
    type: 'function',
    code: `return { success: true, data: { text: params.text, targetLanguage: params.targetLanguage }, display: "text", content: "Please translate the following text to " + params.targetLanguage + ": " + params.text }`,
    toolName: 'translate',
    toolDescription: 'Translate text to a target language.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to translate' },
        targetLanguage: { type: 'string', description: 'Target language, e.g. "English", "Dutch"' },
      },
      required: ['text', 'targetLanguage'],
    },
    installed: false,
    enabled: false,
  },
]

// ── Execute plugin ──

export async function executePlugin(plugin: Plugin, params: Record<string, any>): Promise<ToolResult> {
  try {
    if (plugin.type === 'api') {
      let url = plugin.endpoint || ''
      // Replace {param} placeholders
      for (const [k, v] of Object.entries(params)) {
        url = url.replace(`{${k}}`, encodeURIComponent(String(v)))
      }

      // Special case for QR code — just return the URL
      if (plugin.id === 'qr_code') {
        return { success: true, data: { imageUrl: url }, display: 'markdown', content: `![QR Code](${url})` }
      }

      const res = await fetch(url, {
        method: plugin.method || 'GET',
        headers: plugin.headers || {},
        ...(plugin.method === 'POST' ? { body: JSON.stringify(params) } : {}),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()

      // Format weather data nicely
      if (plugin.id === 'weather' && data.current_condition) {
        const c = data.current_condition[0]
        const content = `🌡️ ${c.temp_C}°C (voelt als ${c.FeelsLikeC}°C)\n☁️ ${c.weatherDesc[0]?.value}\n💧 Luchtvochtigheid: ${c.humidity}%\n💨 Wind: ${c.windspeedKmph} km/h ${c.winddir16Point}`
        return { success: true, data, display: 'text', content }
      }

      return { success: true, data, display: 'text', content: JSON.stringify(data, null, 2).slice(0, 2000) }
    }

    if (plugin.type === 'function' && plugin.code) {
      const fn = new Function('params', plugin.code)
      const result = fn(params)
      if (result && typeof result === 'object' && 'success' in result) return result as ToolResult
      return { success: true, data: result, display: 'text', content: String(result) }
    }

    return { success: false, data: null, display: 'text', content: 'Plugin type not supported' }
  } catch (e: any) {
    return { success: false, data: null, display: 'text', content: `Plugin error: ${e.message}` }
  }
}

// ── Convert plugins to tools ──

export async function getPluginTools(): Promise<Tool[]> {
  let plugins: Plugin[]
  try {
    plugins = await getPlugins()
  } catch {
    return []
  }

  return plugins
    .filter(p => p.installed && p.enabled)
    .map(p => ({
      id: `plugin_${p.toolName}`,
      name: p.name,
      description: p.toolDescription,
      icon: p.icon,
      parameters: p.parameters,
      clientSide: true,
      execute: async (params: any) => executePlugin(p, params),
    }))
}

// ── Init: seed built-in plugins if not present ──

export async function initPlugins(): Promise<void> {
  try {
    const existing = await getPlugins()
    const existingIds = new Set(existing.map(p => p.id))
    for (const bp of BUILTIN_PLUGINS) {
      if (!existingIds.has(bp.id)) {
        await savePlugin(bp)
      }
    }
  } catch {
    // DB not ready yet, skip
  }
}
