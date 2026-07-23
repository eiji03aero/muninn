import { decryptSite } from './crypto.js';

// 本番は site.enc.json（AES暗号）をパスワードで復号、dev は site.json（平文）を読む。
// 注意: 静的ホスティングは存在しないパスに index.html を200で返す（SPAフォールバック）ことがあるため、
// content-type が JSON かつ暗号ペイロード（ct/kdf）を持つことを確認してから暗号扱いする。
const isJson = (res) => (res.headers.get('content-type') || '').includes('json');

export async function loadSite(password) {
  const base = import.meta.env.BASE_URL;

  const enc = await fetch(base + 'site.enc.json', { cache: 'no-store' });
  if (enc.ok && isJson(enc)) {
    let payload = null;
    try { payload = await enc.json(); } catch { payload = null; }
    if (payload && payload.ct && payload.kdf) {
      if (!password) {
        const e = new Error('password required');
        e.code = 'PASSWORD_REQUIRED';
        throw e;
      }
      return await decryptSite(payload, password); // 復号失敗（誤パスワード）は例外
    }
  }

  const plain = await fetch(base + 'site.json', { cache: 'no-store' });
  if (plain.ok && isJson(plain)) return await plain.json();

  throw new Error('データが見つからないのだ（site.json / site.enc.json）');
}
