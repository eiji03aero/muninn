// 復号ゲートと、その周辺（読み込み中・読み込み失敗）。
// どの面が選ばれていても最初に必ず通る層なので、面のUIライブラリ（Chakra）に依存させない。
// 日報を落とす日が来ても、この3画面はそのまま残せる。
import { useState } from 'react';

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

export function PasswordGate({ onSubmit, error }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    await onSubmit(pw);
    setBusy(false);
  };
  return (
    <div className="mn-shell">
      <div className="sh-center">
        <h1 className="sh-wordmark">muninn</h1>
        <p className="sh-lede">パスワードを入れるのだ</p>
        <div className="sh-form">
          <input
            className="sh-input" type="password" value={pw} placeholder="password"
            autoComplete="current-password"
            onChange={(e) => setPw(e.target.value)}
            // 日本語入力の変換確定 Enter を送信と誤認しない
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit(); }}
          />
          <button className="sh-submit" onClick={submit} disabled={busy}>開く</button>
          {error && <p className="sh-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
