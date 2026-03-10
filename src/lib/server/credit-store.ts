type CreditUser = {
  credits: number
  isPro: boolean
  proExpiresAt: string | null
}

const memoryStore = new Map<string, CreditUser>()

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

function keyFor(userToken: string) {
  return `anychat:credits:${userToken}`
}

function normalize(user?: Partial<CreditUser> | null): CreditUser {
  return {
    credits: Number(user?.credits || 0),
    isPro: Boolean(user?.isPro),
    proExpiresAt: user?.proExpiresAt || null,
  }
}

function isProActive(user: CreditUser): boolean {
  if (!user.isPro || !user.proExpiresAt) return false
  return new Date(user.proExpiresAt).getTime() > Date.now()
}

async function kvGet(userToken: string): Promise<CreditUser | null> {
  if (!KV_URL || !KV_TOKEN) return null
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(keyFor(userToken))}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: 'no-store',
  })

  if (!res.ok) return null
  const data = await res.json().catch(() => null) as { result?: CreditUser | null } | null
  if (!data?.result) return null
  return normalize(data.result)
}

async function kvSet(userToken: string, value: CreditUser): Promise<boolean> {
  if (!KV_URL || !KV_TOKEN) return false
  const payload = JSON.stringify(value)
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(keyFor(userToken))}/${encodeURIComponent(payload)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  })
  return res.ok
}

async function load(userToken: string): Promise<CreditUser> {
  const kv = await kvGet(userToken)
  if (kv) return kv
  if (memoryStore.has(userToken)) return memoryStore.get(userToken)!

  const initial = normalize()
  memoryStore.set(userToken, initial)
  return initial
}

async function save(userToken: string, value: CreditUser): Promise<void> {
  memoryStore.set(userToken, value)
  await kvSet(userToken, value).catch(() => undefined)
}

export async function getCreditUser(userToken: string): Promise<CreditUser> {
  const user = await load(userToken)

  if (user.isPro && !isProActive(user)) {
    const downgraded = { ...user, isPro: false, proExpiresAt: null }
    await save(userToken, downgraded)
    return downgraded
  }

  return user
}

export async function addCredits(userToken: string, amount: number): Promise<CreditUser> {
  const user = await getCreditUser(userToken)
  const next = { ...user, credits: user.credits + Math.max(0, amount) }
  await save(userToken, next)
  return next
}

export async function spendCredits(userToken: string, amount: number): Promise<{ ok: boolean; user: CreditUser }> {
  const user = await getCreditUser(userToken)
  if (user.credits < amount) return { ok: false, user }

  const next = { ...user, credits: user.credits - amount }
  await save(userToken, next)
  return { ok: true, user: next }
}

export async function refundCredits(userToken: string, amount: number): Promise<CreditUser> {
  return addCredits(userToken, amount)
}

export async function setPro(userToken: string, expiresAt: string): Promise<CreditUser> {
  const user = await getCreditUser(userToken)
  const next = { ...user, isPro: true, proExpiresAt: expiresAt }
  await save(userToken, next)
  return next
}

export async function clearPro(userToken: string): Promise<CreditUser> {
  const user = await getCreditUser(userToken)
  const next = { ...user, isPro: false, proExpiresAt: null }
  await save(userToken, next)
  return next
}

export function creditStoreMode(): 'kv' | 'memory' {
  return KV_URL && KV_TOKEN ? 'kv' : 'memory'
}
