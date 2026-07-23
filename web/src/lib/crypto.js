// build-data.mjs が AES-256-GCM で暗号化した site.enc.json を、パスワードで復号する。
// Node側（pbkdf2 200k / SHA-256 / ct||tag）と互換の WebCrypto 実装。
const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export async function decryptSite(payload, password) {
  const salt = b64ToBytes(payload.kdf.salt);
  const iv = b64ToBytes(payload.iv);
  const ct = b64ToBytes(payload.ct); // 末尾16byteが GCM tag（WebCryptoはct||tagを受ける）
  const baseKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: payload.kdf.iters, hash: 'SHA-256' },
    baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}
