// Credit system - client-side credit store and utilities
import type { AIModel } from './models';

const DB_NAME = 'anychat_credits';
const STORE_NAME = 'credit_data';
const DB_VERSION = 1;

export interface CreditBalance {
  id: string; // 'balance'
  credits: number;
  userToken: string;
  isPro: boolean;
  proExpiresAt: string | null;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  type: 'purchase' | 'spend' | 'refund';
  amount: number;
  model?: string;
  createdAt: string;
}

// Credit cost per model tier
export function getModelCreditCost(modelId: string): number {
  const tier1 = ['free', 'gemini-2.5-flash', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mistral-small-latest', 'deepseek-chat', 'command-r', 'gpt-4.1-nano'];
  const tier2 = ['gpt-4.1-mini', 'claude-3-5-haiku-20241022', 'grok-3-mini', 'gemini-2.5-pro'];
  const tier3 = ['gpt-4.1', 'claude-sonnet-4-20250514', 'grok-3', 'mistral-large-latest', 'command-r-plus', 'deepseek-reasoner'];
  const tier4 = ['claude-opus-4-20250514', 'o3-mini'];

  if (tier1.includes(modelId)) return 1;
  if (tier2.includes(modelId)) return 2;
  if (tier3.includes(modelId)) return 5;
  if (tier4.includes(modelId)) return 10;
  return 3; // default for unknown models (e.g. openrouter)
}

export function getModelTierLabel(cost: number): string {
  if (cost <= 1) return 'Tier 1';
  if (cost <= 2) return 'Tier 2';
  if (cost <= 5) return 'Tier 3';
  return 'Tier 4';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getUserToken(): Promise<string> {
  const balance = await getCreditBalance();
  return balance.userToken;
}

export async function getCreditBalance(): Promise<CreditBalance> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get('balance');
    req.onsuccess = () => {
      if (req.result) {
        resolve(req.result);
      } else {
        // Initialize with 0 credits and a new user token
        const initial: CreditBalance = {
          id: 'balance',
          credits: 0,
          userToken: generateUserToken(),
          isPro: false,
          proExpiresAt: null,
          updatedAt: new Date().toISOString(),
        };
        resolve(initial);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setCreditBalance(balance: CreditBalance): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ ...balance, updatedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deductCredits(amount: number, modelId: string): Promise<boolean> {
  const balance = await getCreditBalance();
  if (balance.credits < amount) return false;
  balance.credits -= amount;
  await setCreditBalance(balance);
  return true;
}

export async function addCredits(amount: number): Promise<void> {
  const balance = await getCreditBalance();
  balance.credits += amount;
  await setCreditBalance(balance);
}

export async function setProStatus(isPro: boolean, expiresAt: string | null): Promise<void> {
  const balance = await getCreditBalance();
  balance.isPro = isPro;
  balance.proExpiresAt = expiresAt;
  await setCreditBalance(balance);
}

function generateUserToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return 'ac_' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Payment link URLs
export const PAYMENT_LINKS = {
  credits_5: 'https://buy.stripe.com/5kQdR8a6zaYB4Hz7Ia3ZK03',
  credits_10: 'https://buy.stripe.com/8x228qfqT7Mp8XP1jM3ZK04',
  credits_25: 'https://buy.stripe.com/4gM9AS5Qj4Ad3DvfaC3ZK05',
  pro: 'https://buy.stripe.com/8x25kC5Qj1o1ca15A23ZK06',
} as const;

export const CREDIT_PACKAGES = [
  { id: 'starter', price: 5, credits: 500, label: 'Starter', link: PAYMENT_LINKS.credits_5 },
  { id: 'popular', price: 10, credits: 1100, label: 'Popular', bonus: '10% bonus', link: PAYMENT_LINKS.credits_10 },
  { id: 'best_value', price: 25, credits: 3000, label: 'Best Value', bonus: '20% bonus', link: PAYMENT_LINKS.credits_25 },
] as const;
