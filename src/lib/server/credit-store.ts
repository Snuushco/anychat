import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

type CreditUser = {
  credits: number
  isPro: boolean
  proExpiresAt: string | null
}

type CreditLedgerEntry = {
  id: string
  userToken: string
  delta: number
  reason: 'purchase' | 'spend' | 'refund' | 'pro_set' | 'pro_clear'
  sourceEventId?: string | null
  createdAt: string
  metadata?: Record<string, string | number | boolean | null>
}

type CreditStoreFile = {
  users: Record<string, CreditUser>
  ledger: CreditLedgerEntry[]
  processedEvents: Record<string, string>
}

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const DATA_DIR = process.env.ANYCHAT_DATA_DIR || path.join(process.cwd(), '.data', 'anychat')
const FALLBACK_DATA_DIR = path.join(os.tmpdir(), 'anychat')
const STORE_FILE = 'credit-store.json'

let cachedFileStore: CreditStoreFile | null = null
let fileLoadPromise: Promise<CreditStoreFile> | null = null
let writeQueue = Promise.resolve()

function normalize(user?: Partial<CreditUser> | null): CreditUser {
  return {
    credits: Math.max(0, Number(user?.credits || 0)),
    isPro: Boolean(user?.isPro),
    proExpiresAt: user?.proExpiresAt || null,
  }
}

function isProActive(user: CreditUser): boolean {
  if (!user.isPro || !user.proExpiresAt) return false
  return new Date(user.proExpiresAt).getTime() > Date.now()
}

function keyFor(userToken: string) {
  return `anychat:credits:${userToken}`
}

function ledgerKeyFor(userToken: string) {
  return `anychat:credits:ledger:${userToken}`
}

function eventsKey() {
  return 'anychat:credits:processed-events'
}

function createEmptyStore(): CreditStoreFile {
  return {
    users: {},
    ledger: [],
    processedEvents: {},
  }
}

async function ensureWritableDir(): Promise<string> {
  for (const dir of [DATA_DIR, FALLBACK_DATA_DIR]) {
    try {
      await mkdir(dir, { recursive: true })
      return dir
    } catch {
      // try next candidate
    }
  }
  throw new Error('No writable data directory available for AnyChat credit store.')
}

async function readJsonFile(filePath: string): Promise<CreditStoreFile | null> {
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<CreditStoreFile>
    return {
      users: parsed.users || {},
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
      processedEvents: parsed.processedEvents || {},
    }
  } catch {
    return null
  }
}

async function loadFileStore(): Promise<CreditStoreFile> {
  if (cachedFileStore) return cachedFileStore
  if (fileLoadPromise) return fileLoadPromise

  fileLoadPromise = (async () => {
    const dir = await ensureWritableDir()
    const storePath = path.join(dir, STORE_FILE)
    const existing = await readJsonFile(storePath)
    cachedFileStore = existing || createEmptyStore()
    return cachedFileStore
  })()

  try {
    return await fileLoadPromise
  } finally {
    fileLoadPromise = null
  }
}

async function persistFileStore(next: CreditStoreFile): Promise<void> {
  const dir = await ensureWritableDir()
  const storePath = path.join(dir, STORE_FILE)
  cachedFileStore = next
  writeQueue = writeQueue.then(() => writeFile(storePath, JSON.stringify(next, null, 2), 'utf8'))
  await writeQueue
}

async function kvGet<T>(key: string): Promise<T | null> {
  if (!KV_URL || !KV_TOKEN) return null
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: 'no-store',
  })

  if (!res.ok) return null
  const data = await res.json().catch(() => null) as { result?: T | null } | null
  return data?.result ?? null
}

async function kvSet(key: string, value: unknown): Promise<boolean> {
  if (!KV_URL || !KV_TOKEN) return false
  const payload = JSON.stringify(value)
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(payload)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  })
  return res.ok
}

async function getProcessedEvents(): Promise<Record<string, string>> {
  if (KV_URL && KV_TOKEN) {
    return (await kvGet<Record<string, string>>(eventsKey())) || {}
  }
  const store = await loadFileStore()
  return { ...store.processedEvents }
}

async function saveProcessedEvents(processedEvents: Record<string, string>): Promise<void> {
  if (KV_URL && KV_TOKEN) {
    await kvSet(eventsKey(), processedEvents)
    return
  }
  const store = await loadFileStore()
  await persistFileStore({ ...store, processedEvents })
}

async function getLedger(userToken: string): Promise<CreditLedgerEntry[]> {
  if (KV_URL && KV_TOKEN) {
    return (await kvGet<CreditLedgerEntry[]>(ledgerKeyFor(userToken))) || []
  }
  const store = await loadFileStore()
  return store.ledger.filter((entry) => entry.userToken === userToken)
}

async function saveUserAndLedger(userToken: string, user: CreditUser, entry?: CreditLedgerEntry): Promise<void> {
  if (KV_URL && KV_TOKEN) {
    const ledger = await getLedger(userToken)
    if (entry) ledger.push(entry)
    await Promise.all([
      kvSet(keyFor(userToken), user),
      kvSet(ledgerKeyFor(userToken), ledger),
    ])
    return
  }

  const store = await loadFileStore()
  const nextLedger = entry ? [...store.ledger, entry] : store.ledger
  await persistFileStore({
    ...store,
    users: {
      ...store.users,
      [userToken]: user,
    },
    ledger: nextLedger,
  })
}

async function load(userToken: string): Promise<CreditUser> {
  if (KV_URL && KV_TOKEN) {
    const kv = await kvGet<CreditUser>(keyFor(userToken))
    return normalize(kv)
  }

  const store = await loadFileStore()
  return normalize(store.users[userToken])
}

async function appendLedgerEntry(
  userToken: string,
  delta: number,
  reason: CreditLedgerEntry['reason'],
  sourceEventId?: string | null,
  metadata?: CreditLedgerEntry['metadata']
): Promise<CreditUser> {
  const user = await getCreditUser(userToken)
  const next = normalize({
    ...user,
    credits: Math.max(0, user.credits + delta),
  })

  const entry: CreditLedgerEntry | undefined = delta !== 0
    ? {
        id: crypto.randomUUID(),
        userToken,
        delta,
        reason,
        sourceEventId: sourceEventId || null,
        createdAt: new Date().toISOString(),
        metadata,
      }
    : undefined

  await saveUserAndLedger(userToken, next, entry)
  return next
}

export async function getCreditUser(userToken: string): Promise<CreditUser> {
  const user = await load(userToken)

  if (user.isPro && !isProActive(user)) {
    const downgraded = { ...user, isPro: false, proExpiresAt: null }
    await saveUserAndLedger(userToken, downgraded)
    return downgraded
  }

  return user
}

export async function getCreditLedger(userToken: string): Promise<CreditLedgerEntry[]> {
  return getLedger(userToken)
}

export async function addCredits(
  userToken: string,
  amount: number,
  sourceEventId?: string | null,
  metadata?: CreditLedgerEntry['metadata']
): Promise<CreditUser> {
  return appendLedgerEntry(userToken, Math.max(0, amount), 'purchase', sourceEventId, metadata)
}

export async function spendCredits(
  userToken: string,
  amount: number,
  metadata?: CreditLedgerEntry['metadata']
): Promise<{ ok: boolean; user: CreditUser }> {
  const user = await getCreditUser(userToken)
  if (user.credits < amount) return { ok: false, user }

  const next = await appendLedgerEntry(userToken, -Math.max(0, amount), 'spend', null, metadata)
  return { ok: true, user: next }
}

export async function refundCredits(
  userToken: string,
  amount: number,
  metadata?: CreditLedgerEntry['metadata']
): Promise<CreditUser> {
  return appendLedgerEntry(userToken, Math.max(0, amount), 'refund', null, metadata)
}

export async function setPro(userToken: string, expiresAt: string): Promise<CreditUser> {
  const user = await getCreditUser(userToken)
  const next = { ...user, isPro: true, proExpiresAt: expiresAt }
  await saveUserAndLedger(userToken, next)
  return next
}

export async function clearPro(userToken: string): Promise<CreditUser> {
  const user = await getCreditUser(userToken)
  const next = { ...user, isPro: false, proExpiresAt: null }
  await saveUserAndLedger(userToken, next)
  return next
}

export async function markStripeEventProcessed(eventId: string): Promise<boolean> {
  const processed = await getProcessedEvents()
  if (processed[eventId]) return false
  processed[eventId] = new Date().toISOString()
  await saveProcessedEvents(processed)
  return true
}

export async function hasProcessedStripeEvent(eventId: string): Promise<boolean> {
  const processed = await getProcessedEvents()
  return Boolean(processed[eventId])
}

export function creditStoreMode(): 'kv' | 'file' {
  return KV_URL && KV_TOKEN ? 'kv' : 'file'
}
