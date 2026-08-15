// WebAuthn PRF —— パスキー（Face ID / Touch ID）から鍵材料を取り出す層。
//
// 仕様上の位置づけ: WebAuthn 本体は W3C 勧告、PRF 拡張は **Level 3（Candidate Recommendation）**。
// Chromium / WebKit 実装済みで、iOS 18・Safari 18 以降なら iCloud キーチェーンのパスキーで PRF が取れる。
// ただし段差があるので、ここは必ず「取れなかった」を正常系として扱う:
//   - iOS では外部セキュリティキー（YubiKey 等）に拡張データが渡らない＝PRF が取れない
//   - QR のクロスデバイス（hybrid）認証では、オンデバイスとは **異なる PRF 値** が返る実装がある
//     → 他人の PC から QR で開こうとしても包みが解けない。非常口（パスワード）が要るのはこのため
//
// 認証としてではなく **鍵導出として** 使っている点に注意。challenge を検証するサーバは無い
// （静的サイトなので存在しえない）。安全性は署名の検証ではなく、PRF 出力が
// パスキーとユーザー検証（生体）なしには再現できないことから来ている。

const RP_NAME = 'muninn';
// 固定の user.id。同じ端末で登録し直したとき、パスキーが増えずに置き換わるようにする。
const USER_ID = new TextEncoder().encode('muninn-site');

export const webauthnSupported = () =>
  typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;

export async function platformAuthenticatorAvailable() {
  if (!webauthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

const challenge = () => crypto.getRandomValues(new Uint8Array(32));
const prfOut = (cred) => cred?.getClientExtensionResults?.()?.prf?.results?.first || null;

/**
 * 既存のスロットに対して PRF を引く（解錠）。
 * allowCredentials を明示するのは、同じ origin（<user>.github.io）に置いた
 * 他の Pages プロジェクトのパスキーまで候補に出さないため。
 */
export async function assertPrf(prfSaltBytes, credentialIds) {
  const cred = await navigator.credentials.get({
    publicKey: {
      challenge: challenge(),
      userVerification: 'required',
      allowCredentials: credentialIds.map((id) => ({ type: 'public-key', id })),
      extensions: { prf: { eval: { first: prfSaltBytes } } },
    },
  });
  const secret = prfOut(cred);
  if (!secret) throw new Error('この環境ではパスキーから鍵を取り出せない（PRF 非対応）');
  return { rawId: cred.rawId, secret };
}

/**
 * パスキーを作って PRF を引く（登録）。
 * create() が PRF の出力まで返すかは実装差があるため、返らなければ get() で引き直す。
 */
export async function registerPrf(prfSaltBytes) {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: RP_NAME }, // id は省略＝現在のドメインが使われる
      user: { id: USER_ID, name: 'muninn', displayName: 'muninn' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: {
        residentKey: 'required', // 端末に鍵を置く（パスキー）
        userVerification: 'required', // 生体・パスコード必須
      },
      extensions: { prf: { eval: { first: prfSaltBytes } } },
    },
  });
  if (!cred) throw new Error('パスキーを作成できなかった');
  const ext = cred.getClientExtensionResults?.()?.prf;
  if (ext && ext.enabled === false) throw new Error('この端末のパスキーは PRF に対応していない');

  const direct = prfOut(cred);
  if (direct) return { rawId: cred.rawId, secret: direct };
  // create では返らない実装のためのフォールバック。作ったばかりの鍵を名指しで引く。
  const got = await assertPrf(prfSaltBytes, [cred.rawId]);
  return got;
}
