// Client-side chat storage using IndexedDB

const DB_NAME = 'anychat_chats';
const CONVERSATIONS_STORE = 'conversations';
const MESSAGES_STORE = 'messages';
const DB_VERSION = 1;

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  messageCount: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        const store = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
        store.createIndex('conversationId', 'conversationId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function createConversation(model: string): Promise<Conversation> {
  const conv: Conversation = {
    id: crypto.randomUUID(),
    title: 'Nieuw gesprek',
    model,
    messageCount: 0,
    totalCost: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONVERSATIONS_STORE, 'readwrite');
    tx.objectStore(CONVERSATIONS_STORE).put(conv);
    tx.oncomplete = () => resolve(conv);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getConversations(): Promise<Conversation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONVERSATIONS_STORE, 'readonly');
    const request = tx.objectStore(CONVERSATIONS_STORE).getAll();
    request.onsuccess = () => {
      const convs = request.result || [];
      convs.sort((a: Conversation, b: Conversation) => b.updatedAt.localeCompare(a.updatedAt));
      resolve(convs);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateConversation(conv: Conversation): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONVERSATIONS_STORE, 'readwrite');
    tx.objectStore(CONVERSATIONS_STORE).put(conv);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite');
    tx.objectStore(CONVERSATIONS_STORE).delete(id);
    // Delete all messages in this conversation
    const msgStore = tx.objectStore(MESSAGES_STORE);
    const index = msgStore.index('conversationId');
    const request = index.openCursor(IDBKeyRange.only(id));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function addMessage(msg: Message): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MESSAGES_STORE, 'readwrite');
    tx.objectStore(MESSAGES_STORE).put(msg);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MESSAGES_STORE, 'readonly');
    const index = tx.objectStore(MESSAGES_STORE).index('conversationId');
    const request = index.getAll(IDBKeyRange.only(conversationId));
    request.onsuccess = () => {
      const msgs = request.result || [];
      msgs.sort((a: Message, b: Message) => a.createdAt.localeCompare(b.createdAt));
      resolve(msgs);
    };
    request.onerror = () => reject(request.error);
  });
}
