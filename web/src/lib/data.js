import {
  b64ToBytes, b64urlToBytes, bytesToB64url, decryptSite, deriveCK, unwrapCK, wrapCK,
} from './crypto.js';
import { assertPrf, registerPrf } from './webauthn.js';

// 本番は site.enc.json（AES暗号）を解錠、dev は site.json（平文）を読む。
// 解錠の手段は2つあり、どちらも同じコンテンツ鍵 CK にたどり着く:
//   1. パスキー（Face ID）  … 既定。keyslots.json の prf スロットから CK を取り出す
//   2. パスワード          … 非常口。CK を直接導出する
//
// 注意: 静的ホスティングは存在しないパスに index.html を200で返す（SPAフォールバック）ことがあるため、
// content-type が JSON かつ暗号ペイロード（ct/kdf）を持つことを確認してから暗号扱いする。
const isJson = (res) => (res.headers.get('content-type') || '').includes('json');

// 登録直後の端末で、CI のデプロイを待たずに使えるようにするための置き場。
// 正本は web/keyslots.json（コミットされるもの）で、こちらはその端末限りの写し。
const LOCAL_SLOTS = 'mn.keyslots.local';

export function localSlots() {
  try {
    const raw = localStorage.getItem(LOCAL_SLOTS);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function addLocalSlot(slot) {
  const kept = localSlots().filter((s) => s.credentialId !== slot.credentialId);
  localStorage.setItem(LOCAL_SLOTS, JSON.stringify([...kept, slot]));
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok || !isJson(res)) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** 鍵スロット一覧（公開分 ＋ この端末だけの分）。credentialId で重複を潰す。 */
function mergeSlots(keyslots) {
  const all = [...(keyslots?.slots || []), ...localSlots()];
  const seen = new Set();
  return all.filter((s) => {
    if (s?.type !== 'prf' || !s.credentialId || seen.has(s.credentialId)) return false;
    seen.add(s.credentialId);
    return true;
  });
}

/**
 * 平文があればそのまま返す。暗号なら code:'LOCKED' で投げ、`e.lock` に解錠に要る材料を載せる。
 * 「復号する側」と「どう聞くか決める側」を分けたいので、ここでは UI の判断をしない。
 */
export async function loadSite() {
  const base = import.meta.env.BASE_URL;

  const payload = await fetchJson(base + 'site.enc.json');
  if (payload && payload.ct && payload.kdf) {
    const keyslots = await fetchJson(base + 'keyslots.json');
    const e = new Error('locked');
    e.code = 'LOCKED';
    e.lock = { payload, keyslots, prfSlots: mergeSlots(keyslots) };
    throw e;
  }

  const plain = await fetchJson(base + 'site.json');
  if (plain) return plain;

  throw new Error('データが見つからないのだ（site.json / site.enc.json）');
}

/** 非常口。パスワードから CK を導いて復号する（失敗＝例外）。 */
export async function unlockWithPassword(lock, password) {
  const ck = await deriveCK(password, lock.payload.kdf);
  return await decryptSite(lock.payload, ck);
}

/** 既定。Face ID でスロットを解いて CK を取り出し、復号する。 */
export async function unlockWithPasskey(lock) {
  const slots = lock.prfSlots || [];
  if (!slots.length) throw new Error('この端末で使える鍵スロットが無い');

  const prfSalt = b64ToBytes(lock.keyslots.prfSalt);
  const { rawId, secret } = await assertPrf(prfSalt, slots.map((s) => b64urlToBytes(s.credentialId)));

  const used = bytesToB64url(rawId);
  const slot = slots.find((s) => s.credentialId === used);
  if (!slot) throw new Error('使われたパスキーに対応する鍵スロットが無い');

  const ck = await unwrapCK(secret, slot.wrapped);
  return await decryptSite(lock.payload, ck);
}

/**
 * この端末のパスキーを鍵スロットとして登録する。返り値の JSON を正本（web/keyslots.json）に
 * 載せると他の端末にも効くが、載せる前からこの端末では使える（addLocalSlot）。
 *
 * パスワードの正しさを**先に復号して**確かめるのが要点。ここを飛ばすと、打ち間違いのまま
 * 「開かないスロット」を作って、登録が成功したように見えてしまう。
 */
export async function enrollPasskey(lock, password, label, onStep = () => {}) {
  if (!lock?.keyslots?.prfSalt) throw new Error('鍵スロットの定義が読めない（keyslots.json）');

  onStep('パスワードを確かめている…');
  const ck = await deriveCK(password, lock.payload.kdf);
  try {
    await decryptSite(lock.payload, ck);
  } catch {
    throw new Error('パスワードが違うのだ');
  }

  onStep('パスキーを作る。Face ID を見せてくれ');
  const { rawId, secret } = await registerPrf(b64ToBytes(lock.keyslots.prfSalt));
  const slot = {
    id: (label || 'device').trim().toLowerCase().replace(/\s+/g, '-') || 'device',
    type: 'prf',
    label: (label || 'device').trim() || 'device',
    credentialId: bytesToB64url(rawId),
    wrapped: await wrapCK(secret, ck),
    created: new Date().toISOString().slice(0, 10),
  };
  addLocalSlot(slot);
  return slot;
}
