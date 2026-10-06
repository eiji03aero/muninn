// 「新しい版があります」の1行。shell に置くので、どの面を選んでいても・解錠前でも出る。
//
// 出すだけで、勝手には入れ替えない（押すのは読者。DESIGN.md 原則18）。
// 閉じたらこのアプリを開いているあいだは出さない——同じことを繰り返し言われるほうが、
// 言われないより鬱陶しい。次に開いたときには（まだ待っていれば）また出る。
import { useEffect, useState } from 'react';
import { subscribeUpdate } from './update.js';
import { forceReload } from './reload.js';

export function UpdateBar() {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeUpdate(() => setReady(true)), []);

  if (!ready || hidden) return null;

  return (
    <div className="mn-shell mn-update" role="status">
      <span className="mn-update-text">新しい版があります</span>
      <button
        type="button"
        className="mn-update-go"
        disabled={busy}
        onClick={() => { setBusy(true); forceReload(); }}
      >
        {busy ? '読み込み中…' : '↻ 読み込み直す'}
      </button>
      <button type="button" className="mn-update-x" aria-label="閉じる" onClick={() => setHidden(true)}>
        ✕
      </button>
    </div>
  );
}
