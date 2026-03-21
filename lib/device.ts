const DEVICE_ID_KEY = "tlm_device_id";

function createUuid(): string {
  const cryptoObj = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  // Fallback (not RFC4122-perfect, but fine as a stable device id)
  const bytes = new Uint8Array(16);
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(bytes);
  else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.length >= 8) return existing;
  const created = createUuid();
  localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}
