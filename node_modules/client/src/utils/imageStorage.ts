// IndexedDB utility for storing image data
const DB_NAME = 'screening-images';
const DB_VERSION = 2;
const STORE_NAME = 'images';

let db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('recordId', 'recordId', { unique: false });
      } else {
        // Store exists, but ensure index exists (for older databases)
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        if (transaction) {
          const store = transaction.objectStore(STORE_NAME);
          if (!store.indexNames.contains('recordId')) {
            store.createIndex('recordId', 'recordId', { unique: false });
          }
        }
      }
    };
  });
}

export async function storeImages(recordId: string, files: File[]): Promise<void> {
  if (files.length === 0) return;

  // Read all files first before starting the IndexedDB transaction
  // to avoid transaction auto-commit before FileReader completes
  const fileData = await Promise.all(
    files.map((file, index) =>
      new Promise<{ index: number; filename: string; data: string; type: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            index,
            filename: file.name,
            data: reader.result as string,
            type: file.type,
          });
        };
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      })
    )
  );

  const database = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    // First, clear existing images for this record
    const getRequest = store.getAll();
    getRequest.onsuccess = () => {
      const keysToDelete = getRequest.result
        .filter((item: { id: string }) => item.id.startsWith(recordId + '_'))
        .map((item: { id: string }) => item.id);

      // Delete old items
      keysToDelete.forEach((key) => store.delete(key));

      // Store new data (already read as Data URLs)
      fileData.forEach(({ index, filename, data, type }) => {
        const item = {
          id: `${recordId}_${index}`,
          recordId,
          filename,
          data,
          type,
        };
        store.put(item);
      });
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function getImages(recordId: string): Promise<{ url: string; filename: string }[]> {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result
        .filter((item: { id: string }) => item.id.startsWith(recordId + '_'))
        .sort((a: { id: string }, b: { id: string }) => {
          const aIndex = parseInt(a.id.split('_').pop() || '0');
          const bIndex = parseInt(b.id.split('_').pop() || '0');
          return aIndex - bIndex;
        })
        .map((item: { data: string; filename: string }) => ({
          url: item.data,
          filename: item.filename,
        }));
      resolve(results);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteImages(recordId: string): Promise<void> {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const allItems = request.result;
      const keysToDelete = allItems
        .filter((item: { id: string }) => item.id.startsWith(recordId + '_'))
        .map((item: { id: string }) => item.id);

      let deleted = 0;
      if (keysToDelete.length === 0) {
        resolve();
        return;
      }
      keysToDelete.forEach((key) => {
        const deleteReq = store.delete(key);
        deleteReq.onsuccess = () => {
          deleted++;
          if (deleted === keysToDelete.length) {
            resolve();
          }
        };
        deleteReq.onerror = () => {
          deleted++;
          if (deleted === keysToDelete.length) {
            resolve();
          }
        };
      });
    };

    request.onerror = () => reject(request.error);
  });
}

// Optimized: read all images once and group by recordId in memory
// Avoids O(N*M) complexity when iterating over many records
export async function getAllImagesGroupedByRecord(): Promise<
  Record<string, { url: string; filename: string }[]>
> {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const allItems: Array<{ id: string; recordId: string; data: string; filename: string }> =
        request.result;

      const grouped: Record<string, { url: string; filename: string }[]> = {};

      for (const item of allItems) {
        if (!grouped[item.recordId]) {
          grouped[item.recordId] = [];
        }
        grouped[item.recordId].push({
          url: item.data,
          filename: item.filename,
        });
      }

      // Sort each group's images by index order
      for (const recordId of Object.keys(grouped)) {
        grouped[recordId].sort((a, b) => {
          const aIndex = parseInt(a.filename.split('_').pop() || '0');
          const bIndex = parseInt(b.filename.split('_').pop() || '0');
          // If we can't parse index from filename, just keep insertion order
          if (isNaN(aIndex) || isNaN(bIndex)) return 0;
          return aIndex - bIndex;
        });
      }

      resolve(grouped);
    };

    request.onerror = () => reject(request.error);
  });
}
