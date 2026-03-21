type StoredKeyRecord = {
  publicSpkiB64u: string;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
};

const DB_NAME = "tlm_keys";
const DB_VERSION = 1;
const STORE = "keys";
const KEY_ID = "p256";

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLen);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function readRecord(): Promise<StoredKeyRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.get(KEY_ID);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve((req.result as StoredKeyRecord | undefined) ?? null);
  });
}

async function writeRecord(record: StoredKeyRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.put(record, KEY_ID);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

export async function getOrCreateDeviceKeyRecord(): Promise<{ publicSpkiB64u: string }> {
  if (typeof window === "undefined") return { publicSpkiB64u: "" };
  const existing = await readRecord();
  if (existing?.publicSpkiB64u) return { publicSpkiB64u: existing.publicSpkiB64u };

  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"]
  );

  const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicSpkiB64u = base64UrlEncode(spki);

  await writeRecord({
    publicSpkiB64u,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  });

  return { publicSpkiB64u };
}

export async function signProof(payload: string): Promise<string> {
  const record = await readRecord();
  if (!record?.privateKey) {
    await getOrCreateDeviceKeyRecord();
  }
  const current = (await readRecord())!;
  const data = new TextEncoder().encode(payload);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, current.privateKey, data);
  return base64UrlEncode(sig);
}

export async function getPublicSpkiBytes(publicSpkiB64u: string): Promise<Uint8Array> {
  return base64UrlDecodeToBytes(publicSpkiB64u);
}

