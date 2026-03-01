// Tasks & Reminders system — IndexedDB backed

export interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  dueDate?: string
  reminder?: string
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  completedAt?: string
}

export interface Reminder {
  id: string
  taskId?: string
  message: string
  triggerAt: string
  fired: boolean
  createdAt: string
}

const DB_NAME = 'anychat_db'
const DB_VERSION = 2
const TASKS_STORE = 'anychat_tasks'
const REMINDERS_STORE = 'anychat_reminders'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(TASKS_STORE)) db.createObjectStore(TASKS_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(REMINDERS_STORE)) db.createObjectStore(REMINDERS_STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbOp<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const s = tx.objectStore(store)
    const r = fn(s)
    r.onsuccess = () => resolve(r.result as T)
    r.onerror = () => reject(r.error)
  })
}

// ── Tasks CRUD ──

export async function addTask(task: Omit<Task, 'id' | 'createdAt' | 'completed'>): Promise<Task> {
  const full: Task = { ...task, id: crypto.randomUUID(), completed: false, createdAt: new Date().toISOString() }
  await dbOp(TASKS_STORE, 'readwrite', s => s.put(full))
  return full
}

export async function updateTask(task: Task): Promise<void> {
  await dbOp(TASKS_STORE, 'readwrite', s => s.put(task))
}

export async function deleteTask(id: string): Promise<void> {
  await dbOp(TASKS_STORE, 'readwrite', s => s.delete(id))
}

export async function getTasks(): Promise<Task[]> {
  return dbOp<Task[]>(TASKS_STORE, 'readonly', s => s.getAll())
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  return dbOp<Task | undefined>(TASKS_STORE, 'readonly', s => s.get(id))
}

// ── Reminders CRUD ──

export async function addReminder(r: Omit<Reminder, 'id' | 'createdAt' | 'fired'>): Promise<Reminder> {
  const full: Reminder = { ...r, id: crypto.randomUUID(), fired: false, createdAt: new Date().toISOString() }
  await dbOp(REMINDERS_STORE, 'readwrite', s => s.put(full))
  return full
}

export async function updateReminder(r: Reminder): Promise<void> {
  await dbOp(REMINDERS_STORE, 'readwrite', s => s.put(r))
}

export async function deleteReminder(id: string): Promise<void> {
  await dbOp(REMINDERS_STORE, 'readwrite', s => s.delete(id))
}

export async function getReminders(): Promise<Reminder[]> {
  return dbOp<Reminder[]>(REMINDERS_STORE, 'readonly', s => s.getAll())
}

// ── Reminder checking ──

export async function checkReminders(): Promise<Reminder[]> {
  const all = await getReminders()
  const now = new Date().toISOString()
  return all.filter(r => !r.fired && r.triggerAt <= now)
}

export async function markReminderFired(id: string): Promise<void> {
  const all = await getReminders()
  const r = all.find(x => x.id === id)
  if (r) { r.fired = true; await updateReminder(r) }
}

// ── Natural language time parser ──

export function parseNaturalTime(input: string): Date | null {
  const now = new Date()
  const lower = input.trim().toLowerCase()

  // ISO string
  if (/^\d{4}-\d{2}-\d{2}/.test(lower)) {
    const d = new Date(input)
    return isNaN(d.getTime()) ? null : d
  }

  // "over X minuten/uren/uur"
  const overMatch = lower.match(/over\s+(\d+)\s+(minut|minut en|uur|uren|seconde|seconden|dag|dagen)/)
  if (overMatch) {
    const n = parseInt(overMatch[1])
    const unit = overMatch[2]
    const d = new Date(now)
    if (unit.startsWith('minut')) d.setMinutes(d.getMinutes() + n)
    else if (unit.startsWith('uur') || unit.startsWith('uren')) d.setHours(d.getHours() + n)
    else if (unit.startsWith('seconde')) d.setSeconds(d.getSeconds() + n)
    else if (unit.startsWith('dag')) d.setDate(d.getDate() + n)
    return d
  }

  // "in X minutes/hours"
  const inMatch = lower.match(/in\s+(\d+)\s+(minute|minutes|hour|hours|second|seconds|day|days)/)
  if (inMatch) {
    const n = parseInt(inMatch[1])
    const unit = inMatch[2]
    const d = new Date(now)
    if (unit.startsWith('minute') || unit.startsWith('minut')) d.setMinutes(d.getMinutes() + n)
    else if (unit.startsWith('hour')) d.setHours(d.getHours() + n)
    else if (unit.startsWith('second')) d.setSeconds(d.getSeconds() + n)
    else if (unit.startsWith('day')) d.setDate(d.getDate() + n)
    return d
  }

  // "morgen om HH:MM"
  const morgenMatch = lower.match(/morgen\s+om\s+(\d{1,2})[:.:](\d{2})/)
  if (morgenMatch) {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    d.setHours(parseInt(morgenMatch[1]), parseInt(morgenMatch[2]), 0, 0)
    return d
  }

  // "vandaag om HH:MM"
  const vandaagMatch = lower.match(/vandaag\s+om\s+(\d{1,2})[:.:](\d{2})/)
  if (vandaagMatch) {
    const d = new Date(now)
    d.setHours(parseInt(vandaagMatch[1]), parseInt(vandaagMatch[2]), 0, 0)
    return d
  }

  // "om HH:MM" (today)
  const omMatch = lower.match(/om\s+(\d{1,2})[:.:](\d{2})/)
  if (omMatch) {
    const d = new Date(now)
    d.setHours(parseInt(omMatch[1]), parseInt(omMatch[2]), 0, 0)
    if (d <= now) d.setDate(d.getDate() + 1) // if past, assume tomorrow
    return d
  }

  return null
}

// ── In-session scheduling ──

const scheduledTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map()

export function scheduleReminder(reminder: Reminder, onFire: (r: Reminder) => void) {
  const ms = new Date(reminder.triggerAt).getTime() - Date.now()
  if (ms <= 0) { onFire(reminder); return }
  if (ms > 2147483647) return // too far out for setTimeout
  const t = setTimeout(() => { onFire(reminder) }, ms)
  scheduledTimeouts.set(reminder.id, t)
}

export function cancelScheduled(id: string) {
  const t = scheduledTimeouts.get(id)
  if (t) { clearTimeout(t); scheduledTimeouts.delete(id) }
}
