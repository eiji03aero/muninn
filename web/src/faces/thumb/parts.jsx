// 覗き窓・依頼コンポーザ・使い方・トースト。原点と帯の周辺装置。
import { useEffect, useRef, useState } from 'react';
import { shortTitle, cleanTitle } from '../../lib/graph.js';
import { BACK_DIR, DIRS, kindOf, plain, previewOf, tagJa } from './model.js';

// ---------------- 覗き窓 ----------------
// 「リンク元が書いた理由」を最初に読ませてから、跳ぶかどうかを原点で決めさせる装置。
// 遷移せずに中身を判断できることが、行き止まりゼロと並ぶこの面の売り。
const ACT_TEXT = {
  copy: ['依頼をまとめてコピー', '番号つきの1つのテキストになります。Claude Code に貼り付けると、上から順に処理されます。'],
  write: ['新しい依頼を書く', 'テンプレートから選ぶか、自由に書けます。ここで書いても記録は変わりません。反映するのは Claude です。'],
  del: ['この依頼を削除', ''],
  more: ['次の5枚を表示', '並び順は日付で決まります。何度開いても同じ順番です。'],
  ask: ['Claude への依頼', ''],
};

function peekOf(item, ctx) {
  if (!item) return null;
  const { graph } = ctx;
  if (item.path) {
    const pv = previewOf(item.path.node, graph);
    return {
      head: item.path.dir === 'in' ? 'リンク元 ／ タップで開く' : 'リンク先 ／ タップで開く',
      why: item.path.reason || '（理由は未記入）',
      title: pv.title, kind: pv.kind, q: pv.q, ex: pv.ex,
    };
  }
  if (item.hit) {
    const pv = previewOf(item.hit.node, graph);
    return { head: 'タップで開く', why: pv.sub, title: pv.title, kind: pv.kind, ex: pv.ex, q: pv.q };
  }
  if (item.tag) {
    const list = (graph.tags.find((t) => t.tag === item.tag)?.nodes || []).slice(0, 3);
    return {
      head: 'タップで開く', title: tagJa(item.tag), kind: `${graph.tags.find((t) => t.tag === item.tag)?.count}本`,
      ex: list.map((n) => `・${shortTitle(n.title).slice(0, 34)}`).join('\n'),
    };
  }
  if (item.sess) return { head: 'タップで開く', title: `${item.sess.date} の観測`, kind: '観測', ex: item.sess.summary || plain(item.sess.body, 120) };
  if (item.ent) return { head: 'タップで開く', title: cleanTitle(item.ent.title), kind: item.ent.group, why: `${item.ent.role} / ${item.ent.club}`, ex: (item.ent.strengths || []).join(' / ').slice(0, 110) };
  if (item.entry) return { head: 'タップで開く', title: item.entry.title, kind: '記録', ex: plain(item.entry.body, 120) };
  if (item.concept) return { head: 'タップで開く', title: shortTitle(item.concept.title), kind: item.concept.status === 'stub' ? 'まだ書かれていない' : '章', ex: item.concept.gist };
  if (item.route) return { head: 'タップで1章目を開く', title: item.route.label, kind: `${item.route.order.length}章`, ex: item.route.desc };
  if (item.node) { const pv = previewOf(item.node, graph); return { head: 'タップで開く', title: pv.title, kind: pv.kind, why: pv.sub, ex: pv.ex, q: pv.q }; }
  if (item.slip) return { head: 'タップで削除', title: item.slip.label, kind: `${item.slip.date}`, ex: item.slip.line };
  if (item.pending) return { head: 'タップでコピー', title: '再読の結果', kind: `${ctx.pending.length}件`, ex: ctx.pending.map((p) => p.title).join(' ／ ') };
  const a = item.act;
  if (a?.t === 'go') { const pv = previewOf(graph.byRoute.get(a.s.route), graph); return pv ? { head: 'タップで開く', title: pv.title, kind: pv.kind, why: pv.sub, ex: pv.ex, q: pv.q } : null; }
  if (a && ACT_TEXT[a.t]) {
    const [title, ex] = ACT_TEXT[a.t];
    return { head: 'タップで実行', title, ex: a.t === 'ask' ? '' : ex, why: a.t === 'ask' ? a.text : '' };
  }
  return null;
}

export function Peek({ item, ctx }) {
  const p = peekOf(item, ctx);
  if (!p) return null;
  return (
    <div className="tb-peek" aria-live="polite" aria-atomic="true">
      <div className="tb-peekin">
        <div className="tb-peekh"><b>プレビュー</b><i /><span>{p.head}</span></div>
        {p.why && <div className="tb-peekwhy">{p.why}</div>}
        <div className="tb-peekt">{p.title} {p.kind ? <span className="tb-peekk">{p.kind}</span> : null}</div>
        {p.q ? <div className="tb-peekq">問い：{p.q}</div> : <div className="tb-peekx">{p.ex}</div>}
      </div>
    </div>
  );
}

// ---------------- 依頼コンポーザ ----------------
// `t` は Claude にそのまま渡る文なので、muninn の造語（「道」等）を混ぜない——
// 造語は読者に通じないだけでなく、受け取る Claude 側にも通じない。
const TPL = [
  { l: '調べて記事にする', t: 'について調べて、記事にして' },
  { l: '最新の情報に更新', t: 'を最新の情報で更新して' },
  { l: '深掘りする', t: 'をもっと深く掘って、章を書き足して' },
  { l: '関連リンクを張る', t: 'に、関連する記事へのリンクを理由つきで張って' },
  { l: '自由に書く', t: '' },
];

export function Sheet({ prefill, onCancel, onAdd }) {
  const [text, setText] = useState(prefill);
  const [tpl, setTpl] = useState(-1);
  const ta = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => { ta.current?.focus(); ta.current?.setSelectionRange(text.length, text.length); }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const base = prefill.replace(/について、$/, '').replace(/。$/, '');
  return (
    <div className="tb-sheet" role="dialog" aria-modal="true" aria-label="Claude への依頼を書く">
      <div className="tb-sheeth">Claude への依頼を書く</div>
      <div className="tb-tpl" role="group" aria-label="依頼のテンプレート">
        {TPL.map((x, i) => (
          <button key={x.l} type="button" className={i === tpl ? 'is-on' : ''}
            onClick={() => { setTpl(i); setText(x.t ? base + x.t : base); ta.current?.focus(); }}>
            {x.l}
          </button>
        ))}
      </div>
      <label className="tb-sr" htmlFor="tb-composer">依頼の内容</label>
      <textarea id="tb-composer" ref={ta} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="tb-sheetrow">
        <button type="button" onClick={onCancel}>キャンセル</button>
        <button type="button" className="is-pri" onClick={() => onAdd(text.trim())}>依頼リストに追加</button>
      </div>
    </div>
  );
}

// ---------------- 使い方 ----------------
export function Intro({ onClose, onSettings }) {
  return (
    <div className="tb-intro" role="dialog" aria-modal="true" aria-labelledby="tb-introt">
      <div className="tb-introt" id="tb-introt">親指ひとつ</div>
      <div className="tb-intros">操作は画面下のボタン1つだけ</div>
      <ul className="tb-introl">
        <li>画面の<b>上7割は読むための場所</b>です。ボタンや戻る、ヘッダーは置いていません。</li>
        <li>操作は左下の<b>丸いボタン1つ</b>。<b>タップで実行</b>、<b>押したままスワイプで移動</b>します。</li>
        <li>方向と移動先の対応は変わりません。
          <b>{DIRS.map((d) => `${d.arrow}${d.label}`).join(' ')} {BACK_DIR.arrow}{BACK_DIR.label}</b>。
          忘れたときは<i>長押し</i>するとメニューが開きます。
        </li>
        <li>ボタンの上に<b>候補</b>が並びます。横にスワイプして選ぶと、上に内容が表示されます。決定はボタンです。</li>
        <li>ボタンの右の細い<b>スクロールバー</b>で本文を送れます。つまんで動かすか、バーの空いた部分をタップすると1画面分進みます。</li>
        <li>答え合わせのときは<b>ボタンが左右に分かれます</b>。左＝あやしい／右＝わかった。指を動かさずに操作できます。</li>
      </ul>
      <p className="tb-introf">
        パソコンの場合：ボタンはマウスでも操作できます。キーボードは ← → で候補、Enter でボタン、
        1〜4 で移動、Esc で戻る。スクロールバーは Tab で移って ↑ ↓ ・PageUp/PageDown で送れます。<br />
        スクリーンリーダーの場合：ドラッグを使わずに、Tab だけで全部操作できます。
        ボタン・候補・メニューはすべてボタンとして読み上げられます。
      </p>
      <div className="tb-introbtns">
        <button type="button" className="tb-introsub" onClick={onSettings}>画面のかたちを選ぶ</button>
        <button type="button" className="tb-introgo" onClick={onClose}>はじめる</button>
      </div>
    </div>
  );
}

// ---------------- トースト ----------------
export function Toast({ text }) {
  return <div className={`tb-toast${text ? ' is-on' : ''}`} role="status" aria-live="polite">{text}</div>;
}

export { kindOf };
