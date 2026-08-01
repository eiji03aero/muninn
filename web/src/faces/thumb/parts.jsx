// 覗き窓・依頼コンポーザ・使い方・トースト。原点と帯の周辺装置。
import { useEffect, useRef, useState } from 'react';
import { shortTitle, cleanTitle } from '../../lib/graph.js';
import { DIRS, kindOf, plain, previewOf, tagJa } from './model.js';

// ---------------- 覗き窓 ----------------
// 「相手が書いた理由」を最初に読ませてから、跳ぶかどうかを原点で決めさせる装置。
// 遷移せずに中身を判断できることが、行き止まりゼロと並ぶこの面の売り。
const ACT_TEXT = {
  copy: ['伝票をまるごとクリップボードへ', '番号つきの1本のテキストになる。Mac の Claude Code にそのまま貼れば、上から順に処理してもらえる。'],
  write: ['新しい依頼を書く', 'ひな形から選ぶか、自由に書く。書いても muninn は変わらない——変えるのは手元の Claude。'],
  del: ['この依頼を伝票から外す', ''],
  more: ['今日の並びから、次の5枚', '順番は日付から決まっているので、引き直しにはならない。'],
  ask: ['Claude への依頼', ''],
};

function peekOf(item, ctx) {
  if (!item) return null;
  const { graph } = ctx;
  if (item.path) {
    const pv = previewOf(item.path.node, graph);
    return {
      head: item.path.dir === 'in' ? 'ここへ来る道 ／ 原点で移る' : 'ここから伸びる道 ／ 原点で移る',
      why: item.path.reason || '（理由は書かれていない）',
      title: pv.title, kind: pv.kind, q: pv.q, ex: pv.ex,
    };
  }
  if (item.hit) {
    const pv = previewOf(item.hit.node, graph);
    return { head: '原点で開く', why: pv.sub, title: pv.title, kind: pv.kind, ex: pv.ex, q: pv.q };
  }
  if (item.tag) {
    const list = (graph.tags.find((t) => t.tag === item.tag)?.nodes || []).slice(0, 3);
    return {
      head: '原点で降りる', title: tagJa(item.tag), kind: `${graph.tags.find((t) => t.tag === item.tag)?.count}本`,
      ex: list.map((n) => `・${shortTitle(n.title).slice(0, 34)}`).join('\n'),
    };
  }
  if (item.sess) return { head: '原点で開く', title: `${item.sess.date} の観測`, kind: '観測', ex: item.sess.summary || plain(item.sess.body, 120) };
  if (item.ent) return { head: '原点で開く', title: cleanTitle(item.ent.title), kind: item.ent.group, why: `${item.ent.role} / ${item.ent.club}`, ex: (item.ent.strengths || []).join(' / ').slice(0, 110) };
  if (item.entry) return { head: '原点で開く', title: item.entry.title, kind: '記録', ex: plain(item.entry.body, 120) };
  if (item.concept) return { head: '原点で開く', title: shortTitle(item.concept.title), kind: item.concept.status === 'stub' ? 'まだ書かれていない' : '章', ex: item.concept.gist };
  if (item.route) return { head: '原点で1章目から読む', title: item.route.label, kind: `${item.route.order.length}章`, ex: item.route.desc };
  if (item.node) { const pv = previewOf(item.node, graph); return { head: '原点で開く', title: pv.title, kind: pv.kind, why: pv.sub, ex: pv.ex, q: pv.q }; }
  if (item.slip) return { head: '原点で伝票から外す', title: item.slip.label, kind: `${item.slip.date}`, ex: item.slip.line };
  if (item.pending) return { head: '原点で伝票をコピー', title: '再読の結果', kind: `${ctx.pending.length}件`, ex: ctx.pending.map((p) => p.title).join(' ／ ') };
  const a = item.act;
  if (a?.t === 'go') { const pv = previewOf(graph.byRoute.get(a.s.route), graph); return pv ? { head: '原点で開く', title: pv.title, kind: pv.kind, why: pv.sub, ex: pv.ex, q: pv.q } : null; }
  if (a && ACT_TEXT[a.t]) {
    const [title, ex] = ACT_TEXT[a.t];
    return { head: '原点で実行', title, ex: a.t === 'ask' ? '' : ex, why: a.t === 'ask' ? a.text : '' };
  }
  return null;
}

export function Peek({ item, ctx }) {
  const p = peekOf(item, ctx);
  if (!p) return null;
  return (
    <div className="tb-peek" aria-live="polite" aria-atomic="true">
      <div className="tb-peekin">
        <div className="tb-peekh"><b>覗いている</b><i /><span>{p.head}</span></div>
        {p.why && <div className="tb-peekwhy">{p.why}</div>}
        <div className="tb-peekt">{p.title} {p.kind ? <span className="tb-peekk">{p.kind}</span> : null}</div>
        {p.q ? <div className="tb-peekq">問い： {p.q}</div> : <div className="tb-peekx">{p.ex}</div>}
      </div>
    </div>
  );
}

// ---------------- 依頼コンポーザ ----------------
const TPL = [
  { l: '調べて記事に', t: 'について調べて、記事にして' },
  { l: '更新して', t: 'を最新の情報で更新して' },
  { l: '深掘りして', t: 'をもっと深く掘って、章を書き足して' },
  { l: '道を引いて', t: 'に、関連する記事への道（理由つき）を引いて' },
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
      <div className="tb-sheeth">CLAUDE への依頼を書く</div>
      <div className="tb-tpl" role="group" aria-label="依頼のひな形">
        {TPL.map((x, i) => (
          <button key={x.l} type="button" className={i === tpl ? 'is-on' : ''}
            onClick={() => { setTpl(i); setText(x.t ? base + x.t : base); ta.current?.focus(); }}>
            {x.l}
          </button>
        ))}
      </div>
      <label className="tb-sr" htmlFor="tb-composer">依頼の文</label>
      <textarea id="tb-composer" ref={ta} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="tb-sheetrow">
        <button type="button" onClick={onCancel}>やめる</button>
        <button type="button" className="is-pri" onClick={() => onAdd(text.trim())}>伝票に足す</button>
      </div>
    </div>
  );
}

// ---------------- 使い方 ----------------
export function Intro({ hand, onClose, onSettings }) {
  return (
    <div className="tb-intro" role="dialog" aria-modal="true" aria-labelledby="tb-introt">
      <div className="tb-introt" id="tb-introt">親指ひとつ</div>
      <div className="tb-intros">操作原点はひとつ、方向が意味</div>
      <ul className="tb-introl">
        <li>画面の<b>上7割は読むためだけの場所</b>。ボタンも、戻るも、見出し棒も置かない。</li>
        <li>操作は{hand === 'R' ? '右下' : '左下'}の丸＝<b>原点</b>ひとつ。<b>ぽんと叩けば「実行」</b>、<b>押したまま引けば「移動」</b>。</li>
        <li>方向の意味は永久に固定。
          <b>{DIRS.map((d) => `${hand === 'R' ? (d.arrowR || d.arrow) : d.arrow}${d.label}`).join(' ／ ')} ／ ↓戻す</b>。
          忘れても、押しっぱなしにすれば扇が<i>目に見えて</i>開く。
        </li>
        <li>原点の上の<b>帯</b>が候補。指ではじいて選び、選んだものは上に大きく映る。決めるのは原点。</li>
        <li>想起では原点が<b>2つに割れる</b>。左＝あやしい／右＝わかった。指は原点から一歩も動かない。</li>
      </ul>
      <p className="tb-introf">
        PC で見る方へ： 原点はマウスでも押して引けます。キーボードは ← → で帯、Enter で原点、
        1〜4 で行き先、Esc で戻す、H で利き手の左右入れ替え。<br />
        スクリーンリーダーでご覧の方へ： ドラッグを使わずに、Tab だけで全部操作できます。
        原点・帯の候補・「行き先を選ぶ」はすべてボタンです。
      </p>
      <div className="tb-introbtns">
        <button type="button" className="tb-introsub" onClick={onSettings}>面のかたちを選ぶ</button>
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
