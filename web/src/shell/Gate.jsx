// 復号ゲートと、その周辺（読み込み中・読み込み失敗・端末の登録）。
// どの面が選ばれていても最初に必ず通る層なので、面のUIライブラリ（Chakra）に依存させない。
// 日報を落とす日が来ても、この3画面はそのまま残せる。
import { Component, useEffect, useState } from 'react';
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

// 面は動的 import で読み込む。その import が失敗すると、**受け止める者が居なければ
// React はツリーごと畳んで真っ白な画面になる**（#root の中身が空になる）。
// これが実際に起きる: GitHub Pages は毎回 dist を丸ごと置き換えるので、デプロイの前後で
// assets のファイル名が変わり、古い index.html を握ったまま動いているタブが
// **もう存在しないチャンク**を取りに行く。解錠のあいだ（Face ID の数秒）に
// 新しい Service Worker が古いキャッシュを消すと、ちょうどこの窓に入る。
//
// ここは最後の砦なので、握りつぶさない: 一度だけ自動で読み直し、それでも駄目なら
// **何が起きたかと次の一手**を文字で出す。真っ白のまま黙るのだけは避ける。
const RELOADED = 'mn.shell.reloaded';
const isLoadError = (e) => /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch/i.test(String(e?.message || e));

export class FaceBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: null, retried: false };
  }

  static getDerivedStateFromError(err) {
    return { err };
  }

  componentDidCatch(err) {
    if (!isLoadError(err)) return;
    let seen = '1';
    try { seen = sessionStorage.getItem(RELOADED); } catch { /* noop */ }
    if (seen) { this.setState({ retried: true }); return; }
    try { sessionStorage.setItem(RELOADED, '1'); } catch { /* noop */ }
    window.location.reload();
  }

  render() {
    const { err, retried } = this.state;
    if (!err) return this.props.children;
    if (isLoadError(err) && !retried) return <ShellLoading />; // reload 待ち
    return (
      <div className="mn-shell">
        <div className="sh-center">
          <p className="sh-lede">
            {isLoadError(err)
              ? '新しい版が配られた直後で、いまの画面が読み込めなかった。一度アプリを終了してから開き直すと直る。'
              : `画面を組み立てられなかった: ${err?.message || err}`}
          </p>
          <button type="button" className="sh-subtle" onClick={() => { try { sessionStorage.removeItem(RELOADED); } catch { /* noop */ } window.location.reload(); }}>
            もう一度読み込む
          </button>
        </div>
      </div>
    );
  }
}

// 読み込みに成功したら、次の失敗のために「一度は読み直せる」状態へ戻しておく
export function clearReloadGuard() {
  try { sessionStorage.removeItem(RELOADED); } catch { /* noop */ }
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
