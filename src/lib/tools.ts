// Tool system for AnyChat agent mode

import { addMemory, searchMemories } from './memory'
import { addTask, getTasks, updateTask, parseNaturalTime, addReminder, type Task } from './tasks'
import { getPluginTools } from './plugins'

export interface ToolResult {
  success: boolean
  data: any
  display: 'text' | 'code' | 'image' | 'html' | 'markdown'
  content: string
}

export interface Tool {
  id: string
  name: string
  description: string
  icon: string
  parameters: Record<string, any> // JSON Schema
  execute: (params: any) => Promise<ToolResult>
  clientSide: boolean
}

// ── Client-side tools ──

const calculatorTool: Tool = {
  id: 'calculator',
  name: 'Calculator',
  description: 'Evaluate a mathematical expression. Supports basic math, trigonometry, logarithms, etc.',
  icon: '🧮',
  parameters: {
    type: 'object',
    properties: { expression: { type: 'string', description: 'Mathematical expression to evaluate, e.g. "2 * (3 + 4)" or "Math.sqrt(144)"' } },
    required: ['expression'],
  },
  clientSide: true,
  async execute({ expression }: { expression: string }) {
    try {
      const result = new Function(`"use strict"; return (${expression})`)()
      return { success: true, data: result, display: 'text', content: `${expression} = ${result}` }
    } catch (e: any) {
      return { success: false, data: null, display: 'text', content: `Error: ${e.message}` }
    }
  },
}

const datetimeTool: Tool = {
  id: 'datetime',
  name: 'Date & Time',
  description: 'Get the current date, time, and timezone information.',
  icon: '🕐',
  parameters: {
    type: 'object',
    properties: {
      timezone: { type: 'string', description: 'IANA timezone like "Europe/Amsterdam" or "America/New_York". Defaults to user local.' },
    },
    required: [],
  },
  clientSide: true,
  async execute({ timezone }: { timezone?: string }) {
    try {
      const opts: Intl.DateTimeFormatOptions = {
        dateStyle: 'full',
        timeStyle: 'long',
        ...(timezone ? { timeZone: timezone } : {}),
      }
      const now = new Date()
      const formatted = new Intl.DateTimeFormat('nl-NL', opts).format(now)
      const iso = now.toISOString()
      const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      return { success: true, data: { formatted, iso, timezone: tz }, display: 'text', content: `${formatted}\nTimezone: ${tz}\nISO: ${iso}` }
    } catch (e: any) {
      return { success: false, data: null, display: 'text', content: `Error: ${e.message}` }
    }
  },
}

const javascriptTool: Tool = {
  id: 'javascript',
  name: 'JavaScript',
  description: 'Execute JavaScript code and return the result. Console.log output is captured.',
  icon: '⚡',
  parameters: {
    type: 'object',
    properties: { code: { type: 'string', description: 'JavaScript code to execute' } },
    required: ['code'],
  },
  clientSide: true,
  async execute({ code }: { code: string }) {
    const logs: string[] = []
    const fakeConsole = {
      log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args: any[]) => logs.push('[ERROR] ' + args.join(' ')),
      warn: (...args: any[]) => logs.push('[WARN] ' + args.join(' ')),
    }
    try {
      const fn = new Function('console', `"use strict";\n${code}`)
      const result = fn(fakeConsole)
      const output = logs.length ? logs.join('\n') : (result !== undefined ? String(result) : '(no output)')
      return { success: true, data: { result, logs }, display: 'code', content: `// Code:\n${code}\n\n// Output:\n${output}` }
    } catch (e: any) {
      return { success: false, data: null, display: 'code', content: `// Code:\n${code}\n\n// Error:\n${e.message}` }
    }
  },
}

// ── Server-side tools (execute via API routes) ──

const webSearchTool: Tool = {
  id: 'web_search',
  name: 'Web Search',
  description: 'Search the web for current information using DuckDuckGo. Use this when you need up-to-date information.',
  icon: '🔍',
  parameters: {
    type: 'object',
    properties: { query: { type: 'string', description: 'Search query' } },
    required: ['query'],
  },
  clientSide: false,
  async execute({ query }: { query: string }) {
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      const data = await res.json()
      const results = data.results as Array<{ title: string; url: string; snippet: string }>
      if (!results.length) return { success: true, data, display: 'text' as const, content: 'No results found.' }
      const content = results.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`).join('\n\n')
      return { success: true, data, display: 'markdown' as const, content }
    } catch (e: any) {
      return { success: false, data: null, display: 'text' as const, content: `Search error: ${e.message}` }
    }
  },
}

const urlFetchTool: Tool = {
  id: 'url_fetch',
  name: 'Fetch URL',
  description: 'Fetch and extract readable text content from a URL. Useful for reading web pages.',
  icon: '🌐',
  parameters: {
    type: 'object',
    properties: { url: { type: 'string', description: 'URL to fetch' } },
    required: ['url'],
  },
  clientSide: false,
  async execute({ url }: { url: string }) {
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
      const data = await res.json()
      return { success: true, data, display: 'markdown' as const, content: `**${data.title || url}**\n\n${data.content}` }
    } catch (e: any) {
      return { success: false, data: null, display: 'text' as const, content: `Fetch error: ${e.message}` }
    }
  },
}

// ── Memory tools ──

const rememberTool: Tool = {
  id: 'remember',
  name: 'Remember',
  description: 'Save a fact, preference, or instruction about the user to persistent memory.',
  icon: '🧠',
  parameters: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'What to remember' },
      category: { type: 'string', enum: ['preference', 'fact', 'instruction', 'context'], description: 'Category of the memory' },
    },
    required: ['content', 'category'],
  },
  clientSide: true,
  async execute({ content, category }: { content: string; category: string }) {
    try {
      const entry = await addMemory({ content, category: category as any, source: 'chat' })
      return { success: true, data: entry, display: 'text', content: `Onthouden: "${content}" [${category}]` }
    } catch (e: any) {
      return { success: false, data: null, display: 'text', content: `Error: ${e.message}` }
    }
  },
}

const recallTool: Tool = {
  id: 'recall',
  name: 'Recall',
  description: 'Search persistent memories about the user. Use keyword matching.',
  icon: '💭',
  parameters: {
    type: 'object',
    properties: { query: { type: 'string', description: 'Search query keywords' } },
    required: ['query'],
  },
  clientSide: true,
  async execute({ query }: { query: string }) {
    try {
      const results = await searchMemories(query)
      if (results.length === 0) return { success: true, data: [], display: 'text', content: 'Geen herinneringen gevonden.' }
      const content = results.map(r => `- [${r.category}] ${r.content}`).join('\n')
      return { success: true, data: results, display: 'text', content }
    } catch (e: any) {
      return { success: false, data: null, display: 'text', content: `Error: ${e.message}` }
    }
  },
}

// ── Location tool ──

const getLocationTool: Tool = {
  id: 'get_location',
  name: 'Get Location',
  description: 'Get the user\'s current location (latitude, longitude, city, country). Requires user permission.',
  icon: '📍',
  parameters: { type: 'object', properties: {}, required: [] },
  clientSide: true,
  async execute() {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      })
      const { latitude, longitude } = pos.coords
      // Reverse geocode
      try {
        const res = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: latitude, lon: longitude }),
        })
        const geo = await res.json()
        return {
          success: true,
          data: { latitude, longitude, ...geo },
          display: 'text' as const,
          content: `Locatie: ${geo.display_name || `${latitude}, ${longitude}`}\nStad: ${geo.city || 'onbekend'}\nLand: ${geo.country || 'onbekend'}\nCoördinaten: ${latitude}, ${longitude}`,
        }
      } catch {
        return {
          success: true,
          data: { latitude, longitude },
          display: 'text' as const,
          content: `Coördinaten: ${latitude}, ${longitude}`,
        }
      }
    } catch (e: any) {
      return { success: false, data: null, display: 'text' as const, content: `Locatie niet beschikbaar: ${e.message}` }
    }
  },
}

// ── HTML/UI Preview tool ──

const generateUiTool: Tool = {
  id: 'generate_ui',
  name: 'Generate UI',
  description: 'Generate and preview an HTML/CSS/JS page. The HTML will be rendered in a sandboxed preview.',
  icon: '🎨',
  parameters: {
    type: 'object',
    properties: {
      html: { type: 'string', description: 'Complete HTML document or snippet' },
      description: { type: 'string', description: 'Short description of what was generated' },
    },
    required: ['html'],
  },
  clientSide: true,
  async execute({ html, description }: { html: string; description?: string }) {
    return {
      success: true,
      data: { html, description },
      display: 'html' as const,
      content: `\`\`\`html\n${html}\n\`\`\`${description ? `\n\n${description}` : ''}`,
    }
  },
}

// ── Task & Reminder tools ──

const setReminderTool: Tool = {
  id: 'set_reminder',
  name: 'Set Reminder',
  description: 'Set a reminder for a specific time. Supports natural language like "over 30 minuten", "morgen om 09:00", or ISO dates.',
  icon: '⏰',
  parameters: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Reminder message' },
      time: { type: 'string', description: 'When to remind — natural language or ISO date' },
    },
    required: ['message', 'time'],
  },
  clientSide: true,
  async execute({ message, time }: { message: string; time: string }) {
    const triggerAt = parseNaturalTime(time)
    if (!triggerAt) return { success: false, data: null, display: 'text', content: `Kon tijd niet parsen: "${time}"` }
    const reminder = await addReminder({ message, triggerAt: triggerAt.toISOString() })
    const formatted = triggerAt.toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })
    return { success: true, data: reminder, display: 'text', content: `⏰ Herinnering gezet voor ${formatted}: "${message}"` }
  },
}

const addTaskTool: Tool = {
  id: 'add_task',
  name: 'Add Task',
  description: 'Add a to-do task with optional priority and due date.',
  icon: '✅',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Task title' },
      description: { type: 'string', description: 'Optional description' },
      priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Priority level' },
      dueDate: { type: 'string', description: 'Due date (ISO or natural language)' },
    },
    required: ['title'],
  },
  clientSide: true,
  async execute({ title, description, priority, dueDate }: { title: string; description?: string; priority?: string; dueDate?: string }) {
    let dueDateISO: string | undefined
    if (dueDate) {
      const parsed = parseNaturalTime(dueDate)
      if (parsed) dueDateISO = parsed.toISOString()
    }
    const task = await addTask({ title, description, priority: (priority as any) || 'medium', dueDate: dueDateISO })
    return { success: true, data: task, display: 'text', content: `✅ Taak toegevoegd: "${title}" [${task.priority}]` }
  },
}

const listTasksTool: Tool = {
  id: 'list_tasks',
  name: 'List Tasks',
  description: 'List current tasks, optionally filtered by completion status.',
  icon: '📋',
  parameters: {
    type: 'object',
    properties: { completed: { type: 'boolean', description: 'Filter: true=completed, false=open, omit=all' } },
    required: [],
  },
  clientSide: true,
  async execute({ completed }: { completed?: boolean }) {
    let tasks = await getTasks()
    if (completed !== undefined) tasks = tasks.filter(t => t.completed === completed)
    if (tasks.length === 0) return { success: true, data: [], display: 'text', content: 'Geen taken gevonden.' }
    const lines = tasks.map(t => {
      const status = t.completed ? '✅' : '⬜'
      const prio = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'
      return `${status} ${prio} ${t.title}${t.dueDate ? ` (deadline: ${new Date(t.dueDate).toLocaleDateString('nl-NL')})` : ''}`
    })
    return { success: true, data: tasks, display: 'text', content: lines.join('\n') }
  },
}

const completeTaskTool: Tool = {
  id: 'complete_task',
  name: 'Complete Task',
  description: 'Mark a task as completed by ID or title (fuzzy match).',
  icon: '☑️',
  parameters: {
    type: 'object',
    properties: {
      taskId: { type: 'string', description: 'Task ID' },
      title: { type: 'string', description: 'Task title (fuzzy match)' },
    },
    required: [],
  },
  clientSide: true,
  async execute({ taskId, title }: { taskId?: string; title?: string }) {
    const tasks = await getTasks()
    let task: Task | undefined
    if (taskId) task = tasks.find(t => t.id === taskId)
    else if (title) {
      const lower = title.toLowerCase()
      task = tasks.find(t => t.title.toLowerCase().includes(lower))
    }
    if (!task) return { success: false, data: null, display: 'text', content: 'Taak niet gevonden.' }
    await updateTask({ ...task, completed: true, completedAt: new Date().toISOString() })
    return { success: true, data: task, display: 'text', content: `✅ Taak afgerond: "${task.title}"` }
  },
}

// ── Registry ──

export const ALL_TOOLS: Tool[] = [webSearchTool, urlFetchTool, javascriptTool, calculatorTool, datetimeTool, rememberTool, recallTool, getLocationTool, generateUiTool, setReminderTool, addTaskTool, listTasksTool, completeTaskTool]

// Load plugin tools dynamically
export async function getAllToolsWithPlugins(): Promise<Tool[]> {
  try {
    const pluginTools = await getPluginTools()
    return [...ALL_TOOLS, ...pluginTools]
  } catch {
    return ALL_TOOLS
  }
}

export function getEnabledTools(): Tool[] {
  if (typeof window === 'undefined') return ALL_TOOLS
  try {
    const stored = localStorage.getItem('anychat_enabled_tools')
    if (!stored) return ALL_TOOLS
    const ids: string[] = JSON.parse(stored)
    return ALL_TOOLS.filter(t => ids.includes(t.id))
  } catch {
    return ALL_TOOLS
  }
}

export function setEnabledTools(ids: string[]) {
  localStorage.setItem('anychat_enabled_tools', JSON.stringify(ids))
}

export function getToolById(id: string): Tool | undefined {
  return ALL_TOOLS.find(t => t.id === id)
}

// Convert tools to OpenAI function calling format
export function toolsToOpenAI(tools: Tool[]) {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.id,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}

// Convert tools to Anthropic format
export function toolsToAnthropic(tools: Tool[]) {
  return tools.map(t => ({
    name: t.id,
    description: t.description,
    input_schema: t.parameters,
  }))
}

// Convert tools to Google Gemini format
export function toolsToGemini(tools: Tool[]) {
  return [{
    functionDeclarations: tools.map(t => ({
      name: t.id,
      description: t.description,
      parameters: t.parameters,
    })),
  }]
}
