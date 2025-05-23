// src/utils/indexedDB.ts

const DB_NAME = 'imageCache';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedImage {
  id: string;
  data: string;
  timestamp: number;
  size: number;
}

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        
        // Create indexes
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('size', 'size', { unique: false });
      }
    };
  });
};

const calculateDataURLSize = (dataURL: string): number => {
  // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
  const base64 = dataURL.split(',')[1];
  // Calculate size: base64 string length * 3/4 (base64 encoding ratio)
  return Math.ceil((base64.length * 3) / 4);
};

export const getCacheSize = async (): Promise<number> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('size');
    const request = index.openCursor();
    let totalSize = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        totalSize += cursor.value.size;
        cursor.continue();
      } else {
        resolve(totalSize);
      }
    };

    request.onerror = () => reject(request.error);
  });
};

export const cleanupCache = async (): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const timestampIndex = store.index('timestamp');
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const request = timestampIndex.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const image = cursor.value as CachedImage;
        if (now - image.timestamp > CACHE_EXPIRY) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
};

export const addImageData = async (id: string, dataURL: string): Promise<void> => {
  const db = await openDB();
  const size = calculateDataURLSize(dataURL);
  const currentSize = await getCacheSize();
  
  // If adding this image would exceed the cache size, remove oldest entries
  if (currentSize + size > MAX_CACHE_SIZE) {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const timestampIndex = store.index('timestamp');
    
    return new Promise((resolve, reject) => {
      const request = timestampIndex.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && currentSize + size > MAX_CACHE_SIZE) {
          cursor.delete();
          cursor.continue();
        } else {
          // Now add the new image
          const image: CachedImage = {
            id,
            data: dataURL,
            timestamp: Date.now(),
            size
          };
          
          const addRequest = store.put(image);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(addRequest.error);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } else {
    // Cache has enough space, just add the image
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const image: CachedImage = {
        id,
        data: dataURL,
        timestamp: Date.now(),
        size
      };
      
      const request = store.put(image);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

export const getImageData = async (id: string): Promise<string | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const image = request.result as CachedImage | undefined;
      if (image) {
        // Update timestamp on access
        const updateTransaction = db.transaction(STORE_NAME, 'readwrite');
        const updateStore = updateTransaction.objectStore(STORE_NAME);
        image.timestamp = Date.now();
        updateStore.put(image);
        resolve(image.data);
      } else {
        resolve(null);
      }
    };

    request.onerror = () => reject(request.error);
  });
};

export const clearCache = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getCacheStats = async (): Promise<{ totalSize: number; itemCount: number }> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const sizeIndex = store.index('size');
    const request = sizeIndex.openCursor();
    let totalSize = 0;
    let itemCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        totalSize += cursor.value.size;
        itemCount++;
        cursor.continue();
      } else {
        resolve({ totalSize, itemCount });
      }
    };

    request.onerror = () => reject(request.error);
  });
};

export const clearImageFromCache = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
