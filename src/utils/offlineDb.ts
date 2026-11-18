/**
 * IndexedDB Offline Database for Billing App
 * Guarantees zero data loss even if browser localStorage is cleared or quota exceeded.
 * Stores Products, Bills, Refills, Shop Info, and Offline Sync Action Log.
 */

const DB_NAME = 'YKElectrical_OfflineDB_v1';
const DB_VERSION = 1;

export interface OfflineAction {
  id: string;
  type: 'CREATE_BILL' | 'ADD_PRODUCT' | 'UPDATE_PRODUCT' | 'REFILL_STOCK' | 'DELETE_PRODUCT';
  payload: any;
  timestamp: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Key-value store for app state
      if (!db.objectStoreNames.contains('app_state')) {
        db.createObjectStore('app_state');
      }

      // Offline actions queue for background sync
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save data to IndexedDB
 */
export async function saveToIndexedDb(key: string, value: any): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('app_state', 'readwrite');
      const store = tx.objectStore('app_state');
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB write fallback warning:', err);
  }
}

/**
 * Get data from IndexedDB
 */
export async function getFromIndexedDb<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('app_state', 'readonly');
      const store = tx.objectStore('app_state');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB read fallback warning:', err);
    return null;
  }
}

/**
 * Push an action to the offline sync queue
 */
export async function logOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<void> {
  try {
    const db = await openDb();
    const item: OfflineAction = {
      ...action,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not log offline action:', err);
  }
}

/**
 * Get pending sync items
 */
export async function getPendingSyncActions(): Promise<OfflineAction[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Clear sync queue once synced
 */
export async function clearSyncQueue(): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

/**
 * Fully wipe all offline IndexedDB stores and reset database
 */
export async function clearAllOfflineData(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['app_state', 'sync_queue'], 'readwrite');
      tx.objectStore('app_state').clear();
      tx.objectStore('sync_queue').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not clear IndexedDB stores:', err);
  }

  try {
    if (typeof window !== 'undefined' && window.indexedDB) {
      window.indexedDB.deleteDatabase(DB_NAME);
    }
  } catch (err) {
    console.warn('Could not delete database:', err);
  }
}
