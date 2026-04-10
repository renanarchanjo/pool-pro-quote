const DB_NAME = "pdf-image-cache";
const STORE_NAME = "images";
const DB_VERSION = 1;
const TTL_MS = 3600 * 1000; // 1 hour

interface CacheEntry {
  base64: string;
  timestamp: number;
}

const getKeyFromUrl = (url: string): string => {
  // Use the FULL URL as cache key to avoid collisions between different URLs
  // that share the same origin+pathname but differ in query params
  return url;
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const pdfImageCacheGet = async (url: string): Promise<string | null> => {
  try {
    const db = await openDb();
    const key = getKeyFromUrl(url);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry | undefined;
        if (entry && Date.now() - entry.timestamp < TTL_MS) {
          resolve(entry.base64);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const pdfImageCacheSet = async (url: string, base64: string): Promise<void> => {
  try {
    const db = await openDb();
    const key = getKeyFromUrl(url);
    const entry: CacheEntry = { base64, timestamp: Date.now() };
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(entry, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silent
  }
};
