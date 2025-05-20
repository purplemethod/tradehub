// src/utils/indexedDB.ts

const DB_NAME = "productImageCache";
const DB_VERSION = 1;
const STORE_NAME = "images";

let db: IDBDatabase | null = null;

/**
 * Opens the IndexedDB database.
 * @returns A Promise that resolves with the database instance.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (event: Event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event: Event) => {
      reject(`IndexedDB error: ${(event.target as IDBOpenDBRequest).error}`);
    };
  });
}

/**
 * Adds data to the 'images' object store.
 * @param data The data object to add ({ id: string, dataURL: string }).
 * @returns A Promise that resolves when the data is added.
 */
export async function addImageData(data: {
  id: string;
  dataURL: string;
}): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event: Event) => {
      reject(
        `Error adding data to IndexedDB: ${(event.target as IDBRequest).error}`
      );
    };

    transaction.oncomplete = () => {
      // Transaction completed
    };

    transaction.onerror = (event: Event) => {
      reject(
        `Transaction error during add: ${
          (event.target as IDBTransaction).error
        }`
      );
    };
  });
}

/**
 * Retrieves data from the 'images' object store by id.
 * @param id The id of the data to retrieve.
 * @returns A Promise that resolves with the data object or undefined if not found.
 */
export async function getImageData(
  id: string
): Promise<{ id: string; dataURL: string } | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBRequest).result);
    };

    request.onerror = (event: Event) => {
      reject(
        `Error retrieving data from IndexedDB: ${
          (event.target as IDBRequest).error
        }`
      );
    };

    transaction.onerror = (event: Event) => {
      reject(
        `Transaction error during get: ${
          (event.target as IDBTransaction).error
        }`
      );
    };
  });
}
