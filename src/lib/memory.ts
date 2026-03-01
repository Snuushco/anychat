// Persistent memory system using IndexedDB

export interface MemoryEntry {
  id: string
  category: 'preference' | 'fact' | 'instruction' | 'context'
  content: string
  createdAt: string
  source: string
}

const DB_NAME = 'anychat_memory'
const STORE_NAME = 'memories'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function addMemory(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): Promise<MemoryEntry> {
  const memory: MemoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(memory)
    tx.oncomplete = () => resolve(memory)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllMemories(): Promise<MemoryEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export async function searchMemories(query: string): Promise<MemoryEntry[]> {
  const all = await getAllMemories()
  const lower = query.toLowerCase()
  const keywords = lower.split(/\s+/).filter(Boolean)
  return all.filter(m => {
    const content = m.content.toLowerCase()
    return keywords.some(k => content.includes(k))
  })
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearAllMemories(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getRecentMemories(limit = 20): Promise<MemoryEntry[]> {
  const all = await getAllMemories()
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
}

export function buildMemoryContext(memories: MemoryEntry[]): string {
  if (memories.length === 0) return ''
  const lines = memories.map(m => `- [${m.category}] ${m.content}`)
  return `Je hebt de volgende informatie over de gebruiker:\n${lines.join('\n')}\n\nGebruik deze context waar relevant. Je kunt nieuwe dingen onthouden met de 'remember' tool.`
}
