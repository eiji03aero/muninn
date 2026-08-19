// 復号ゲートと、その周辺（読み込み中・読み込み失敗・端末の登録）。
// どの面が選ばれていても最初に必ず通る層なので、面のUIライブラリ（Chakra）に依存させない。
// 日報を落とす日が来ても、この3画面はそのまま残せる。
import { useEffect, useState } from 'react';
import { platformAuthenticatorAvailable } from '../lib/webauthn.js';
import { Enroll } from './Enroll.jsx';

export function ShellLoading() {
  return (
    <div className="mn-shell">
      <div className="sh-center"><div className="sh-spinner" role="status" aria-label="読み込み中" /></div>
    </div>
  );
}

export function ShellError({ message }) {
  return (
    <div className="mn-shell">
      <div className="sh-center"><p className="sh-lede">読み込み失敗: {message}</p></div>
    </div>
  );
}

/**
 * 解錠の入口。**Face ID を主、パスワードを非常口**として出す。
 * パスワードを畳んでおくのは、そこにキーボードがあると結局そっちを使ってしまい、
 * 「打鍵ゼロで開く」という変更の目的が達成されないため。ただし畳むだけで、消しはしない
 * （PRF が効かない環境が実在する。詳細は lib/webauthn.js）。
 */
export function LockGate({ lock, onPasskey, onPassword, error }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [platformOk, setPlatformOk] = useState(null); // null = 判定中

  // 注意: hasSlots は「鍵スロットが存在するか」であって「**この端末が**登録済みか」ではない。
  // WebAuthn には「この端末に鍵があるか」を事前に問い合わせる手段が無い（プライバシー上わざと無い）ので、
  // 実際に試すまで分からない。だから登録導線を hasSlots で消してはならない（下の注記を参照）。
  const hasSlots = (lock?.prfSlots?.length || 0) > 0;
  const canPasskey = platformOk && hasSlots;

  useEffect(() => {
    let alive = true;
    platformAuthenticatorAvailable().then((ok) => { if (alive) setPlatformOk(ok); });
    return () => { alive = false; };
  }, []);

  // Face ID で開けないと分かった時点で、非常口を畳んでおく理由が無くなる
  useEffect(() => { if (platformOk !== null && !canPasskey) setShowPw(true); }, [platformOk, canPasskey]);

  // 解錠に失敗したら非常口を開く。閉じたままにすると
  // 「押しても何も起きない画面」で行き止まりになる（原則6）
  useEffect(() => { if (error) setShowPw(true); }, [error]);

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    await fn();
    setBusy(false);
  };

  if (enrolling) {
    return <Enroll lock={lock} onBack={() => setEnrolling(false)} />;
  }

  return (
    <div className="mn-shell">
      <div className="sh-center">
        <h1 className="sh-wordmark">muninn</h1>
        <p className="sh-lede">
          {platformOk === null ? ' ' : canPasskey ? '顔を見せるのだ' : 'パスワードを入れるのだ'}
        </p>
        {/* 判定が済むまで何も出さない。先にパスワード欄を出すと、Face ID が使える端末でも
            一瞬キーボードの入口が見えて、そちらに手が伸びてしまう */}
        <div className="sh-form" hidden={platformOk === null}>
          {canPasskey && (
            <button className="sh-submit" onClick={() => run(() => onPasskey())} disabled={busy}>
              Face ID で開く
            </button>
          )}

          {showPw ? (
            <>
              <input
                className="sh-input" type="password" value={pw} placeholder="password"
                autoComplete="current-password" autoFocus={!canPasskey}
                onChange={(e) => setPw(e.target.value)}
                // 日本語入力の変換確定 Enter を送信と誤認しない
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) run(() => onPassword(pw));
                }}
              />
              <button
                className={canPasskey ? 'sh-subtle' : 'sh-submit'}
                onClick={() => run(() => onPassword(pw))} disabled={busy}
              >
                開く
              </button>
            </>
          ) : (
            canPasskey && (
              <button className="sh-link" onClick={() => setShowPw(true)}>パスワードで開く</button>
            )
          )}

          {error && <p className="sh-error">{error}</p>}

          {/* 登録導線は **スロットの有無で消してはならない**。
              かつて `!hasSlots` を条件にしていたが、hasSlots は keyslots.json 全体の状態なので、
              1台目を登録した瞬間に **2台目以降の登録導線が全端末で消えた**。
              未登録の端末には「効かない Face ID ボタン」だけが残り、行き止まりになった（原則6違反）。
              判定できない条件で導線を隠すな——出しておいて、押した人に試させるほうが安い。 */}
          {platformOk && (
            <button className="sh-link" onClick={() => setEnrolling(true)}>
              {hasSlots ? 'この端末を登録する' : 'この端末を登録して Face ID で開く'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
