const enc = new TextEncoder();
const dec = new TextDecoder();

/** IndexedDB outbox; business payloads are AES-GCM encrypted with a key
 * provided by the application's PIN/secure-storage layer and never persisted here. */
export class EncryptedOutbox {
  constructor({ keyProvider, databaseName = "agrimarche-local" }) {
    this.keyProvider = keyProvider;
    this.databaseName = databaseName;
    this.dbPromise = null;
  }

  async key() {
    const key = await this.keyProvider?.();
    if (!key || key.type !== "secret" || !key.usages.includes("encrypt") || !key.usages.includes("decrypt")) {
      throw new Error("Unlock the app to protect local Cloud changes.");
    }
    return key;
  }

  db() {
    if (!globalThis.indexedDB) return Promise.reject(new Error("Encrypted offline storage is unavailable in this environment."));
    if (!this.dbPromise) this.dbPromise = new Promise((resolve, reject) => {
      const open = indexedDB.open(this.databaseName, 1);
      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox", { keyPath: "op_id" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error || new Error("Offline storage could not be opened."));
    });
    return this.dbPromise;
  }

  async enqueue({ op_id = crypto.randomUUID(), record_id, base_version = null, payload }) {
    if (!record_id || !payload || typeof payload !== "object") throw new Error("Invalid local sync operation.");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await this.key(), enc.encode(JSON.stringify(payload)));
    const db = await this.db();
    const tx = db.transaction("outbox", "readwrite");
    tx.objectStore("outbox").put({ op_id, record_id, base_version, iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(ciphertext)), created_at: new Date().toISOString() });
    await transactionDone(tx);
    return op_id;
  }

  async peek(limit = 25) {
    const db = await this.db();
    const tx = db.transaction("outbox", "readonly");
    const done = transactionDone(tx);
    const rows = await requestResult(tx.objectStore("outbox").getAll());
    await done;
    const key = await this.key();
    return Promise.all(rows.sort((a,b) => a.created_at.localeCompare(b.created_at)).slice(0, Math.min(25, limit)).map(async row => {
      const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(row.iv) }, key, new Uint8Array(row.ciphertext));
      return { op_id: row.op_id, record_id: row.record_id, base_version: row.base_version, payload: JSON.parse(dec.decode(plaintext)) };
    }));
  }

  async remove(opId) {
    const db = await this.db(); const tx = db.transaction("outbox", "readwrite");
    tx.objectStore("outbox").delete(opId); await transactionDone(tx);
  }
  async count() {
    const db = await this.db(); const tx = db.transaction("outbox", "readonly");
    const done = transactionDone(tx); const count = await requestResult(tx.objectStore("outbox").count()); await done; return count;
  }
  async getCursor() {
    const db = await this.db(); const tx = db.transaction("meta", "readonly");
    const done = transactionDone(tx); const row = await requestResult(tx.objectStore("meta").get("pull_cursor")); await done; return row?.value || 0;
  }
  async setCursor(value) {
    const db = await this.db(); const tx = db.transaction("meta", "readwrite");
    tx.objectStore("meta").put({ key: "pull_cursor", value }); await transactionDone(tx);
  }
}

function requestResult(request) {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
function transactionDone(tx) {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error || new Error("Offline storage write failed.")); });
}
