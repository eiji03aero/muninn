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

  const hasSlots = (lock?.prfSlots?.length || 0) > 0;
  const canPasskey = platformOk && hasSlots;

  useEffect(() => {
    let alive = true;
    platformAuthenticatorAvailable().then((ok) => { if (alive) setPlatformOk(ok); });
    return () => { alive = false; };
  }, []);

  // Face ID で開けないと分かった時点で、非常口を畳んでおく理由が無くなる
  useEffect(() => { if (platformOk !== null && !canPasskey) setShowPw(true); }, [platformOk, canPasskey]);

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

          {/* 未登録の端末に道を示す。この行が見えていること自体が
              「新しいビルドが配信されている」印にもなる（古いSWに掴まれていると出ない） */}
          {platformOk && !hasSlots && (
            <button className="sh-link" onClick={() => setEnrolling(true)}>
              この端末を登録して Face ID で開く
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
