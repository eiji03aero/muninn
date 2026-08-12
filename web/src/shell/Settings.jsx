// 設定。いまは「読む面のかたちを選ぶ」だけを持つ。
//
// どの面が選ばれていても `#/settings` で直接開ける非常口を兼ねる。面の作法を覚えていないと
// 設定に戻れない状態を作らないこと——3つの面は互いに操作体系がまったく違うので、
// ここが塞がると「面を試したら二度と元に戻せない」が普通に起きる。
import { FACES, loadUsage } from './face.js';
import { recallLog } from '../lib/recall.js';

// 3面並行は実験。始め方より終わらせ方を先に決めておかないと、ただの負債になる。
const TRIAL_FROM = '2026-08-01';
const TRIAL_UNTIL = '2026-08-29'; // 4週間

export function Settings({ faceId, onPick, onClose }) {
  const usage = loadUsage();
  // 面ごとの再読枚数。判断材料はこれと利用日数の2つだけで、どちらも**増えるカウンタ**にする
  // （未消化の件数＝減らない借金を出さない。DESIGN.md 原則3）。
  const reads = {};
  for (const r of recallLog()) if (r.via) reads[r.via] = (reads[r.via] || 0) + 1;

  return (
    <div className="mn-shell">
      <div className="sh-page">
        <div className="sh-head">
          <h1 className="sh-title">画面のかたち</h1>
          <button className="sh-close" onClick={onClose}>閉じる</button>
        </div>

        <div className="sh-slot">読むときの画面を選ぶ</div>
        <div className="sh-faces">
          {FACES.map((f) => {
            const on = f.id === faceId;
            const days = usage[f.id]?.days || 0;
            const n = reads[f.id] || 0;
            return (
              <button key={f.id} className="sh-face" aria-pressed={on} onClick={() => onPick(f.id)}>
                <span className="sh-face-top">
                  <span className="sh-face-name">{f.label}</span>
                  {on && <span className="sh-face-on">いま使っている</span>}
                </span>
                <span className="sh-face-hint">{f.hint}</span>
                <span className="sh-face-stat">
                  使った日数 {days}日{n > 0 ? ` ／ ここで再読 ${n}枚` : ''}
                </span>
              </button>
            );
          })}
        </div>

        <div className="sh-slot">この3つについて</div>
        <div className="sh-note">
          <p>
            読むもの（記事・章・記録）はどれも同じで、変わるのは<strong>並べ方と操作のしかた</strong>だけ。
            かたちの違う3つを<strong>同時に持っているのは実験</strong>で、
            {TRIAL_UNTIL.replace(/^\d{4}-/, '').replace('-', '/')} までに<strong>1つに絞る</strong>。
          </p>
          <p>
            決め手は上に出ている<strong>使った日数と再読の枚数</strong>——
            気に入ったと言うかどうかではなく、実際にどれを開いて何枚読んだかで決める。
            絞ったあと、選ばれなかったかたちはここから消える。
          </p>
          <p>
            読んだ記録・溜めた依頼はかたちをまたいで1つなので、
            どれに切り替えても積み上げは失われない。
          </p>
        </div>
      </div>
    </div>
  );
}

export { TRIAL_FROM, TRIAL_UNTIL };
