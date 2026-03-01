// Encrypted API key storage using IndexedDB + Web Crypto API
import { encryptApiKey, decryptApiKey, maskApiKey } from './crypto';
import type { Provider } from './models';

const DB_NAME = 'anychat_keys';
const STORE_NAME = 'api_keys';
const DB_VERSION = 1;

export interface StoredKey {
  provider: Provider;
  encryptedKey: string;
  maskedKey: string;
  addedAt: string;
  lastUsed: string | null;
  isValid: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'provider' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveApiKey(provider: Provider, plainKey: string): Promise<StoredKey> {
  const encrypted = await encryptApiKey(plainKey);
  const masked = maskApiKey(plainKey);
  const entry: StoredKey = {
    provider,
    encryptedKey: encrypted,
    maskedKey: masked,
    addedAt: new Date().toISOString(),
    lastUsed: null,
    isValid: true,
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getApiKey(provider: Provider): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(provider);
    request.onsuccess = async () => {
      if (!request.result) return resolve(null);
      try {
        const key = await decryptApiKey(request.result.encryptedKey);
        resolve(key);
      } catch {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllKeys(): Promise<StoredKey[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteApiKey(provider: Provider): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(provider);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function validateApiKey(provider: Provider, key: string): Promise<boolean> {
  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      return res.ok;
    }
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      return res.ok;
    }
    if (provider === 'google') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      return res.ok;
    }
    if (provider === 'xai') {
      const res = await fetch('https://api.x.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      return res.ok;
    }
    if (provider === 'mistral') {
      const res = await fetch('https://api.mistral.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      return res.ok;
    }
    if (provider === 'deepseek') {
      const res = await fetch('https://api.deepseek.com/models', {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      return res.ok;
    }
    if (provider === 'cohere') {
      const res = await fetch('https://api.cohere.com/v1/models', {
        headers: { 'Authorization': `bearer ${key}` },
      });
      return res.ok;
    }
    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      return res.ok;
    }
    if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      return res.ok;
    }
    return false;
  } catch {
    return false;
  }
}
