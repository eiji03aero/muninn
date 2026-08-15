// 鍵まわり。**コンテンツ鍵 CK を中心に据える**のがこの層の設計。
//
//   CK = PBKDF2-SHA256(パスワード, keyslots.kdf.salt, 200k)   ← 本文はこれ1本で暗号化されている
//   site.enc.json = AES-256-GCM(CK, iv)
//
// パスキー（WebAuthn PRF）は CK を作るのではなく、**CK を包む鍵**を作る。
// ビルドは GitHub Actions で走るので PRF の出力を知りようがない——だから
// 「PRF から本文の鍵を導く」ことは原理的にできない。包む側に回すことで成立する。
//
//   Kw      = HKDF-SHA256(PRF出力, info="muninn/keyslot/v2")
//   slot.wrapped = AES-GCM(Kw, iv) で CK を包んだもの（公開してよい）
//
// 結果、スロットは何本でも足せる（LUKS のキースロットと同じ）。端末を1台増やしても
// 本文を暗号化し直す必要はなく、スロットを1本足すだけで済む。

const enc = new TextEncoder();

export const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
// 扱うのは鍵・iv・credentialId だけ（数十バイト）。本文はここを通らないので spread で足りる。
export const bytesToB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
export const bytesToB64url = (buf) =>
  bytesToB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const b64urlToBytes = (s) =>
  b64ToBytes(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));

/** パスワードから CK（32byte）を導出する。kdf は keyslots.json / site.enc.json のもの。 */
export async function deriveCK(password, kdf) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: b64ToBytes(kdf.salt), iterations: kdf.iters, hash: kdf.hash || 'SHA-256' },
    base, 256,
  );
  return new Uint8Array(bits);
}

/** CK で site.enc.json を復号する。鍵違い・改竄は GCM の認証タグ検証で例外になる。 */
export async function decryptSite(payload, ck) {
  const key = await crypto.subtle.importKey('raw', ck, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(payload.iv) },
    key,
    b64ToBytes(payload.ct), // 末尾16byteが GCM tag（WebCrypto は ct||tag を受ける）
  );
  return JSON.parse(new TextDecoder().decode(pt));
}

// PRF の出力をそのまま AES 鍵にせず HKDF を挟むのは、用途ごとに鍵を分けられる状態を保つため
// （将来スロット以外の用途が増えても、info を変えれば同じ PRF から別の鍵を作れる）。
async function wrappingKey(prfSecret, usages) {
  const ikm = await crypto.subtle.importKey('raw', prfSecret, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode('muninn/keyslot/v2') },
    ikm, { name: 'AES-GCM', length: 256 }, false, usages,
  );
}

/** PRF出力で CK を包む（登録時）。返り値は base64 の iv||ct||tag。 */
export async function wrapCK(prfSecret, ck) {
  const kw = await wrappingKey(prfSecret, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kw, ck);
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), 12);
  return bytesToB64(out);
}

/** PRF出力で CK を取り出す（解錠時）。 */
export async function unwrapCK(prfSecret, wrapped) {
  const kw = await wrappingKey(prfSecret, ['decrypt']);
  const raw = b64ToBytes(wrapped);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, kw, raw.slice(12));
  return new Uint8Array(pt);
}
