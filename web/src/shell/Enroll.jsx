// この端末のパスキーを鍵スロットに登録する画面。**ゲートの中に置いてある**。
//
// 最初は独立した public/enroll.html にしていたが、PWA のサービスワーカーが
// navigateFallback で index.html を返すため、**古いSWが居る端末では登録ページに永久に辿り着けなかった**。
// SW が生きている限り、アプリの外に置いた .html はいつでも飲まれる。
// 「index.html が返ってきても目的地」＝アプリの中、が唯一安定する置き場所。
import { useState } from 'react';
import { enrollPasskey } from '../lib/data.js';

export function Enroll({ lock, onBack }) {
  const [pw, setPw] = useState('');
  const [label, setLabel] = useState('iPhone');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [slot, setSlot] = useState(null);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const s = await enrollPasskey(lock, pw, label, setMsg);
      setSlot(s);
      setMsg('');
    } catch (e) {
      const cancelled = e?.name === 'NotAllowedError' || e?.name === 'AbortError';
      setMsg('');
      setError(cancelled ? '中断した' : (e?.message || '登録できなかった'));
    }
    setBusy(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(slot, null, 2));
      setMsg('コピーした');
    } catch {
      setMsg('コピーできなかった。手で選んでコピーしてくれ');
    }
  };

  if (slot) {
    return (
      <div className="mn-shell">
        <div className="sh-center">
          <h1 className="sh-wordmark">muninn</h1>
          <p className="sh-lede">登録できた。この端末はもう Face ID で開く</p>
          <div className="sh-form">
            <textarea className="sh-code" readOnly value={JSON.stringify(slot, null, 2)} />
            <p className="sh-hint">これを Claude に渡すと正本に載り、同期している他の端末にも効く</p>
            <button className="sh-submit" onClick={copy}>コピーする</button>
            {/* 読み込み直して新しいスロットを拾わせる。手で lock を差し替えるより確実 */}
            <button className="sh-subtle" onClick={() => location.reload()}>サイトを開く</button>
            {msg && <p className="sh-lede">{msg}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mn-shell">
      <div className="sh-center">
        <h1 className="sh-wordmark">muninn</h1>
        <p className="sh-lede">この端末を登録すると、次から Face ID だけで開く</p>
        <div className="sh-form">
          <input
            className="sh-input" type="password" value={pw} placeholder="いまのパスワード"
            autoComplete="current-password"
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) run(); }}
          />
          <input
            className="sh-input" type="text" value={label} placeholder="この端末の名前"
            onChange={(e) => setLabel(e.target.value)}
          />
          <button className="sh-submit" onClick={run} disabled={busy}>
            パスキーを作って登録する
          </button>
          <button className="sh-link" onClick={onBack} disabled={busy}>やめる</button>
          {msg && <p className="sh-lede">{msg}</p>}
          {error && <p className="sh-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
