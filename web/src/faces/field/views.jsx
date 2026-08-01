// 欄の中身から面を組む。
//
// **すべてのビューは「欄に近い順」の配列を返す。** 描画側が reverse して上へ積むので、
// 配列の先頭（index 0）が常に画面のいちばん下＝親指のいちばん近く＝ソフトキーボードの直上になる。
// 法則がひとつしかない、という主張をデータ構造そのもので保証するための約束事。
//
// 項目は `act` を持てば選べる（↑↓ と Enter の対象になる）。持たなければ飾り。

import { Sparkline } from '../../shared/Sparkline.jsx';
import { tagLabel, cleanTitle } from '../../lib/graph.js';
import { dayIndex, hash32 } from '../../lib/edition.js';
import { plain, nearMiss, mocLabel, displayTitle } from './items.js';
import { relDay } from '../../shared/util.js';

// 読み専用のサイトから出せる「頼み」は、muninn の4つの入口に対応する4つしかない。
// 隠さず常時見せる（コマンド駆動UIの弱点は発見可能性なので、ひな形ごと出す）。
export const TEMPLATES = [
  { t: 'を調べて記録して', d: '新しい客観知識を足す' },
  { t: 'の定点観測をはじめて', d: '追いたい対象ができたとき' },
  { t: 'を体系立てて学びたい', d: '分野ごと順路をひいてもらう' },
  { t: 'を記録帖につけて', d: '並べて比べたいものができたとき' },
];

export const composeAsk = (text, ctx) =>
  (ctx ? `/mn 「${ctx}」を読んでいて出た問い: ${text}` : `/mn ${text}`);

const metricClass = (points, goal) => {
  if (!goal || points.length < 2) return 'neu';
  const a = points[0].value; const b = points[points.length - 1].value;
  return (goal === 'up' ? b >= a : b <= a) ? 'good' : 'warn';
};
// 折れ線の色も「良し悪しを宣言した指標だけ」色を持つ。中立の指標を緑にすると数字が嘘をつく。
const METRIC_COLOR = { good: '#7fd1a3', warn: '#e9736b', neu: '#7b7f85' };

// ---------------- 空欄の面（この面で一番豊かであること） ----------------
export function viewHome({ site, graph, edition, seen, week, api, today }) {
  const stack = [];

  // 0. 想起カード —— 欄の真上。モード切替なしで流れてくる（受け入れ条件19）
  stack.push({ k: 'recall' });

  // 2. 定点のうごき —— 良い方に動いた一本と、宣言に反して悪い方に動いたものを必ず並べる
  const fmov = site.follows.filter((f) => (f.sessions || []).length)
    .sort((a, b) => (b.sessions[0].date || '').localeCompare(a.sessions[0].date || ''))[0];
  const followRoute = fmov ? `/follow/${fmov.name}` : null;

  // 1. きょうの一本（定点の段と同じものを2度出さない。同じ日に同じ札が2枚並ぶと面が痩せて見える）
  const lead = leadOf(edition, graph, followRoute) || revivalOf(site, graph, today);
  if (lead) {
    stack.push({
      k: 'block', key: 'lead', head: lead.kicker, title: lead.title, body: lead.body,
      act: () => api.open(lead.route),
    });
  }

  if (fmov) {
    const s0 = fmov.sessions[0];
    const S = fmov.series || [];
    const bad = S.filter((sr) => sr.goal && metricClass(sr.points, sr.goal) === 'warn');
    const good = S.filter((sr) => sr.goal && metricClass(sr.points, sr.goal) === 'good');
    const show = good.slice(0, 1).concat(bad.slice(0, 2));
    stack.push({
      k: 'block', key: 'follow',
      head: `定点のうごき　${relDay(s0.date, today)}`,
      title: cleanTitle(fmov.title),
      body: s0.summary || plain(s0.body, 120),
      act: () => api.open(followRoute),
      extra: (
        <>
          {(show.length ? show : S.slice(0, 2)).map((sr) => {
            const cls = metricClass(sr.points, sr.goal);
            return (
              <div className="ff-metric" key={sr.key}>
                <span className="ff-metric-key">{sr.key}{sr.goal ? '' : '（良し悪しは決めていない）'}</span>
                <span className="ff-metric-spark">
                  <Sparkline points={sr.points} height={18} goal={sr.goal} color={METRIC_COLOR[cls]} />
                </span>
                <span className={`ff-metric-val ${cls}`}>{sr.points[sr.points.length - 1].value}</span>
              </div>
            );
          })}
          {bad.length > 0 && (
            <p className="ff-warn">
              ↑ {bad.map((x) => x.key + (x.goal === 'down' ? '（下げたいのに上がった）' : '（上げたいのに下がった）')).join('　')}
            </p>
          )}
        </>
      ),
    });
  }

  // 3. 連載のつづき
  if (edition.chapter) {
    const { atlas, route, concept, readCount, total } = edition.chapter;
    stack.push({
      k: 'block', key: 'chapter',
      head: `つづきを読む　${cleanTitle(atlas.title)} / ${route.label}　${readCount}/${total}`,
      title: concept.title, body: concept.gist || '',
      act: () => api.open(`/atlas/${atlas.slug}/concept/${concept.slug}`),
    });
  }

  // 4. ゆうべの続き
  if (seen.length) {
    stack.push({
      k: 'recent', key: 'recent',
      items: seen.slice(0, 3).filter((s) => graph.byRoute.has(s.route)),
      api,
    });
  }

  // 5. たな（在庫への入口）
  const shelfBtns = [
    { label: 'ぜんぶ見わたす（# を打つ）', act: () => api.setQuery('#') },
    ...(site.logtopics || []).map((l) => ({ label: cleanTitle(l.title), act: () => api.open(`/log/${l.slug}`) })),
    ...site.mocs.filter((m) => m.slug !== 'home').slice(0, 3)
      .map((m) => ({ label: mocLabel(m.title), act: () => api.open(`/moc/${m.slug}`) })),
  ];
  stack.push({ k: 'chips', key: 'shelf', head: 'たな', items: shelfBtns });

  // 6. 日付と、増えるカウンタ（未消化の総量は絶対に出さない）
  stack.push({
    k: 'rule', key: 'head',
    left: today.replace(/-/g, '.'),
    right: week > 0 ? `今週 ${week}件 再読した` : 'きょうから数える',
  });

  return stack;
}

// composeEdition のリード段を「きょうの一本」に翻訳する。
// 紙面編成そのものは lib/edition.js（共有）に任せ、ここは見出しの言い換えだけを持つ。
function leadOf(edition, graph, avoid) {
  const c = edition.lead;
  if (!c) return null;
  const of = (route, kicker) => {
    if (route === avoid) return null;
    const n = graph.byRoute.get(route);
    return n ? { route, kicker, title: displayTitle(n), body: plain(n.body, 140) } : null;
  };
  switch (c.type) {
    case 'speed': return of(c.node.route, `あたらしい　${c.ago === 0 ? 'きょう' : `${c.ago}日前`}`);
    case 'milestone': return of(`/follow/${c.follow.name}`, '記録がうごいた');
    case 'chapter-new': return of(`/atlas/${c.atlas.slug}/concept/${c.concept.slug}`, 'あたらしい章');
    case 'brief': return of(`/follow/${c.follow.name}`, 'もうすぐ');
    case 'revival': return of(`/note/${c.note.slug}`, `ひさしぶり　${c.ago}日ぶり`);
    case 'feature': {
      const first = c.bundle?.items?.[0]?.node;
      if (c.bundle?.moc) return of(`/moc/${c.bundle.moc}`, `束　${c.bundle.title}`);
      return first ? of(first.route, `束　${c.bundle.title}`) : null;
    }
    default: return null;
  }
}

// リード段が定点の段とぶつかったときの控え。更新がいちばん古い20本から日替わりで1本引く
// （lib/edition.js の復刻カードと同じ規則。乱数は使わない＝リロードで引き直せない）。
function revivalOf(site, graph, today) {
  const pool = site.notes.filter((n) => n.updated).sort((a, b) => (a.updated < b.updated ? -1 : 1)).slice(0, 20);
  if (!pool.length) return null;
  const n = pool[(dayIndex(today) + hash32('field-revival')) % pool.length];
  const node = graph.byRoute.get(`/note/${n.slug}`);
  return node ? {
    route: node.route, kicker: 'ひさしぶり', title: node.short || node.title, body: plain(node.body, 140),
  } : null;
}

// ---------------- 打っている状態 ----------------
export function viewFind({ items, str, res, api }) {
  const toks = str.toLowerCase().split(/\s+/).filter(Boolean);
  const zero = res.length === 0;
  const stack = [];

  // 依頼行は常に欄の真上・不動。「見つかっても頼める」＝この面の出口が一本であることの表明。
  stack.push({
    k: 'row', key: 'floor',
    label: 'たのむ',
    title: zero ? `muninn にはまだ無い。「${str}」を Claude に頼む` : `「${str}」を Claude に頼む`,
    sub: zero ? '見つからなかったことが、次の蓄積の入口になる' : 'ここを押せば依頼になる',
    cls: `ff-floor${zero ? ' hot' : ''}`,
    pref: zero,
    act: () => api.setQuery(`>${str}`),
  });

  if (zero) {
    // ゼロヒットを「ありません」で終わらせない（受け入れ条件16・17）
    for (const t of TEMPLATES) {
      stack.push({
        k: 'row', key: `t:${t.t}`, label: 'たのむ',
        title: `「${str}」${t.t}`, sub: t.d,
        act: () => api.setQuery(`>${str}${t.t}`),
      });
    }
    stack.push({ k: 'rule', key: 'r-out', left: 'ここから先は muninn の外' });
    const near = nearMiss(items, str);
    for (const it of near) {
      stack.push({ k: 'row', key: it.id, label: it.label, title: it.title, sub: it.sub, act: () => api.open(it.id) });
    }
    if (near.length) {
      stack.push({ k: 'rule', key: 'r-near', left: 'ぴたりとは無い', right: '近いのはこのあたり' });
    }
  } else {
    res.forEach((it, i) => {
      stack.push({
        k: 'row', key: it.id, label: it.label, title: it.title, sub: it.sub,
        toks, pref: i === 0, act: () => api.open(it.id),
      });
    });
    stack.push({ k: 'rule', key: 'r-hit', left: res.length >= 9 ? '上位9件' : `${res.length}件` });
  }
  return stack;
}

// ---------------- # 束ねる（在庫の俯瞰） ----------------
export function viewShelf({ site, graph, rest, api }) {
  const all = graph.tags;
  const hit = rest
    ? all.filter((x) => x.tag.toLowerCase().includes(rest.toLowerCase()) || x.label.includes(rest))
    : all;
  const stack = [];

  // 単一タグに絞れたら、その中身へ自然に降りる
  if (rest && hit.length === 1) {
    const t = hit[0];
    const list = [...t.nodes].sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
    for (const n of list) {
      stack.push({
        k: 'row', key: n.route, label: null, title: displayTitle(n),
        sub: (n.updated || '').replace(/-/g, '.'), act: () => api.open(n.route),
      });
    }
    stack.push({ k: 'rule', key: 'r', left: `${t.label} · ${list.length}本`, right: '新しい順' });
    return stack;
  }

  const top = hit.slice(0, 10);
  const restTags = hit.slice(10);
  const max = Math.max(1, ...all.map((x) => x.count));

  for (const t of top) {
    stack.push({ k: 'bar', key: t.tag, label: t.label, n: t.count, max, act: () => api.setQuery(`#${t.label}`) });
  }
  if (restTags.length) {
    stack.push({
      k: 'bar', key: '__rest', dim: true,
      label: restTags.map((x) => x.label).join('・'),
      n: restTags.reduce((a, b) => a + b.count, 0), max,
    });
  }

  // 上段（遠い）: 定点・連載・記録帖・束。逆順に積んで、描画時に元の並びへ戻す
  const others = [
    ...site.mocs.filter((m) => m.slug !== 'home').map((m) => ({
      route: `/moc/${m.slug}`, label: '索引', title: mocLabel(m.title),
      sub: (m.sections || []).map((s) => s.title).join(' · '),
    })),
    ...(site.logtopics || []).map((l) => ({
      route: `/log/${l.slug}`, label: '記録帖', title: cleanTitle(l.title), sub: `${l.entries.length}件`,
    })),
    ...(site.atlases || []).map((a) => ({
      route: `/atlas/${a.slug}`, label: '連載', title: cleanTitle(a.title),
      sub: `${a.concepts.length}章 · 順路${a.routes.length}本`,
    })),
    ...site.follows.map((f) => ({
      route: `/follow/${f.name}`, label: '定点', title: cleanTitle(f.title), sub: `${f.sessions.length}回の観測`,
    })),
  ];
  for (const o of [...others].reverse()) {
    stack.push({ k: 'row', key: o.route, label: o.label, title: o.title, sub: o.sub, act: () => api.open(o.route) });
  }

  stack.push({
    k: 'rule', key: 'r', left: 'たな',
    right: `記事 ${site.notes.length}　定点 ${site.follows.length}　連載 ${(site.atlases || []).length}　束 ${site.mocs.length - 1}`,
  });
  return stack;
}

// ---------------- > 頼む（伝票） ----------------
export function viewAsk({ rest, slips, pending, ctx, api }) {
  const stack = [];

  if (!rest) {
    if (slips.length || pending.length) {
      stack.push({ k: 'slipacts', key: 'acts', slips, pending, api });
    }
    for (const s of [...slips].reverse()) {
      stack.push({ k: 'slip', key: s.id, slip: s, api });
    }
    if (pending.length) {
      stack.push({
        k: 'note', key: 'pending',
        text: `答え合わせ（再読の結果）${pending.length}件も、いっしょに渡せる`,
      });
    }
    stack.push({ k: 'templates', key: 'tp' });
    stack.push({
      k: 'rule', key: 'r', left: 'でんぴょう',
      right: slips.length ? `${slips.length}件たまっている` : '打てばそのまま依頼になる',
    });
    return stack;
  }

  const text = composeAsk(rest, ctx);
  stack.push({ k: 'askacts', key: 'acts', text, api });
  stack.push({ k: 'pre', key: 'pre', text });
  stack.push({ k: 'rule', key: 'r', left: 'たのむ', right: ctx ? '文脈つき' : '' });
  return stack;
}

// ---------------- ? 使い方 ----------------
export const HELP_ROWS = [
  ['（空）', 'きょう差し出されるもの。想起カードは欄の真上に来る'],
  ['文字', '記事・定点・人・章・記録・束を横断して絞り込む'],
  ['#', '在庫を束ねて見る。#ゴルフ のように続ければ降りる'],
  ['>', 'Claude への依頼をつくって伝票にためる'],
  ['?', 'この一覧'],
  ['◀', '前の面へ。欄に文字があるときは、まず欄を消す'],
  ['↑↓ / Enter', '選ぶ／ひらく（変換中の Enter は効かない）'],
  ['…', 'めくったあとは、下の欄がそのまま「一言」の欄になる。書くと定着が深くなる'],
  ['↺', '判定はいつでも取り消せる。直前の一件はカードに残り続ける'],
];

export function viewHelp({ api }) {
  return [
    { k: 'helpacts', key: 'acts', api },
    { k: 'help', key: 'help' },
    { k: 'rule', key: 'r', left: 'つかいかた' },
  ];
}

