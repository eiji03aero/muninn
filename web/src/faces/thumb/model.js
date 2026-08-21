// 面「親指ひとつ」がデータを見るときの下ごしらえ。
//
// lib/ の索引はそのまま使う（作り直さない）。ここで足すのは、この面が必要とする2つだけ:
//
//   1. **frontmatter 由来の被リンク**。lib/graph.js の被リンクは本文の [[link]] だけを逆引きする。
//      連載の型付きエッジ（requires 等）と章→記事の蒸留は frontmatter にあるので、そのままだと
//      「ここへ来る道」から落ちて、章と蒸留ノートが行き止まりに見える。この面は
//      「行き止まりゼロ」を約束しているので、面の側で足す（lib には触らない）。
//   2. **覗き窓に出す一口分の要約**。遷移せずに中身を判断させるための材料。

import { resolveTarget } from '../../lib/wiki.js';
import { linksWithReason, cleanTitle, shortTitle, tagLabel } from '../../lib/graph.js';

// タグの表示名は lib と揃える（面ごとに呼び名が変わると記録が読めなくなる）
export const tagJa = tagLabel;

// 章どうしのエッジは、向きによって読み手への意味が変わる。
// 「来る道」は相手から見た理由、「伸びる道」はこちらから見た理由を出す。
const EDGE_IN = {
  requires: 'この章を前提にしている',
  contrasts: 'この章と対比される',
  leadsTo: 'この章から発展した先',
  elaborates: 'この章を深掘りしている',
};
export const EDGE_OUT = {
  requires: { k: '前提', why: 'これを先に読むと分かる' },
  contrasts: { k: '対比', why: 'これと対比すると輪郭が出る' },
  leadsTo: { k: '発展', why: 'ここから発展した' },
  elaborates: { k: '深掘り', why: 'ここを深掘りしている' },
};
export const EDGE_KEYS = ['requires', 'contrasts', 'leadsTo', 'elaborates'];

// 内部語彙（notes / atlas / MOC …）は画面に出さない。ここが語の変換点。
const TYPE_JA = {
  note: '記事', concept: '章', entity: '人物', session: '観測',
  logentry: '記録', follow: '定点', atlas: '連載', logtopic: '記録帖', moc: '見取り図',
};
export const kindOf = (node) =>
  (node?.type === 'note' && node.kind === 'insight') ? '気づき' : (TYPE_JA[node?.type] || '');

export const mocTitle = (node) => `${cleanTitle(node.title)}`;

// 末尾の `## Links` 節を落とす。この面ではリンクを理由つきの「道」として別に出すので、
// 押せないリンクの一覧が本文に残ると壊れて見える。
export const stripLinks = (body) =>
  String(body || '').replace(/\n#{2,4}\s*(?:Links?|リンク)\s*\n[\s\S]*$/i, '\n');

// 正本の文にも内部語彙（アトラス / MOC / mn-xxx）が混じることがある。画面には出さない
// （web/DESIGN.md）。**表示の直前でだけ**言い換え、正本の markdown には手を触れない。
// 置き換えるのは読者向けの呼び名が決まっているものだけに絞る（意味を歪めないため）。
export function deint(s) {
  return String(s || '')
    .replace(/学習アトラス|知識アトラス|アトラス/g, '連載')
    .replace(/\s*[（(]\s*\/?mn-[a-z-]+\s*[）)]/g, '')
    .replace(/\/?mn-[a-z-]+/g, '')
    .replace(/\bMOC\b/g, '見取り図')
    .replace(/[ \t]{2,}/g, ' ');
}

// markdown を落として、覗き窓・一覧に出せる素の文にする。
export function plain(s, max = 0) {
  let t = deint(s)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => (b || a))
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*>#|]+\s*/gm, '')
    .replace(/[*`_]/g, '')
    .replace(/\[\[|\]\]/g, '')
    .replace(/\s*\n+\s*/g, ' ／ ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (max && t.length > max) t = `${t.slice(0, max)}…`;
  return t;
}

// [[x]] をただの文字列に落とす。**この面の上7割にはリンクを置かない**ので、
// 本文のリンクは「読める語」にだけして、跳ぶ手段は下の帯（道）に集約する。
//
// 末尾の `## Links` 節はまるごと落とす。この面では同じ情報を「ここから伸びる道」として
// 理由つきで出しているので、押せないリンクの一覧が本文の末尾に残ると壊れて見える。
export function wikiToPlainText(body, idx) {
  return deint(stripLinks(body)).replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t, alias) => {
    const r = resolveTarget(t, idx);
    return (alias || '').trim() || (r ? shortTitle(r.label) : t.trim());
  });
}

// ---- frontmatter 由来の被リンク ----
export function extraBacklinks(site, graph) {
  const m = new Map();
  const add = (route, o) => {
    if (!graph.byRoute.has(route)) return;
    if (!m.has(route)) m.set(route, []);
    m.get(route).push(o);
  };
  for (const a of site.atlases || []) {
    for (const c of a.concepts) {
      const from = { route: `/atlas/${a.slug}/concept/${c.slug}`, title: shortTitle(c.title), type: 'concept' };
      for (const key of EDGE_KEYS) {
        for (const t of c.edges?.[key] || []) {
          add(`/atlas/${a.slug}/concept/${t}`, { ...from, reason: EDGE_IN[key] });
        }
      }
      for (const ns of c.notes || []) {
        add(`/note/${ns}`, { ...from, reason: `連載「${cleanTitle(a.title)}」のこの章から蒸留された知識` });
      }
    }
  }
  return m;
}

// ---- ここへ来る道 / ここから伸びる道 ----
export function insOf(route, graph, extra) {
  const seen = new Set();
  const out = [];
  for (const b of [...(graph.backlinks.get(route) || []), ...(extra.get(route) || [])]) {
    if (seen.has(b.route)) continue;
    seen.add(b.route);
    const node = graph.byRoute.get(b.route);
    if (node) out.push({ node, reason: b.reason });
  }
  return out;
}

export function outsOf(node, graph, idx) {
  const seen = new Set([node.route]);
  const out = [];
  for (const { target, reason } of linksWithReason(node.body)) {
    const r = resolveTarget(target, idx);
    if (!r || seen.has(r.route)) continue;
    seen.add(r.route);
    const to = graph.byRoute.get(r.route);
    if (to) out.push({ node: to, reason });
  }
  return out;
}

// ---- 覗き窓に出す一口 ----
export function previewOf(node, graph) {
  if (!node) return null;
  const base = { title: shortTitle(node.title), kind: kindOf(node), sub: '', ex: plain(node.body, 140), q: '' };
  switch (node.type) {
    case 'note':
      return { ...base, sub: (node.tags || []).map(tagJa).join('・'), q: node.ref.recall || '' };
    case 'concept':
      return { ...base, sub: node.ref.status === 'written' ? '書けている' : 'まだ書かれていない', ex: plain(node.ref.gist || node.body, 140) };
    case 'entity':
      return { ...base, sub: [node.ref.role, node.ref.club].filter(Boolean).join(' / '), ex: (node.ref.strengths || []).join(' / ') || base.ex };
    case 'follow':
      return { ...base, sub: node.ref.followType === 'goal' ? 'よくなりたい' : 'もっと楽しみたい', ex: node.ref.goal || base.ex };
    case 'session':
      return { ...base, sub: node.ref.date, ex: node.ref.summary || base.ex };
    case 'moc':
      return { ...base, sub: `${(node.ref.sections || []).length}つの束`, ex: (node.ref.sections || []).map((s) => s.title).join('・') };
    case 'logtopic':
      return { ...base, sub: `${node.ref.entries.length}件`, ex: (node.ref.fields || []).map((f) => f.label).join('・') };
    case 'atlas':
      return { ...base, sub: `${node.ref.concepts.length}章`, ex: plain(node.body, 140) };
    default:
      return base;
  }
}

// ---- 方向の意味 ----
// **画面をまたいで固定**（受け入れ条件4）。ここを画面ごとに変えたら、この面は成立しない。
// 主要動線は4つに絞る（扇のウェッジが狭くなるとラジアルの優位が消える）。1階層で終わり。
//
// `deg` は扇のウェッジを**同じ半径の弧に等間隔で載せる**ための角度で、`hit` は
// 引いた方向をその行き先に振り分ける境界（deg より広く取る）。半径は4つとも同じ
// FAN_R で、ウェッジは中心をその円周に置く——半径を1つだけ変えると弧が崩れて見える。
export const FAN_R = 126;
export const DIRS = [
  { id: 'today', label: '今日', deg: -8, hit: 8, arrow: '→', say: '横' },
  { id: 'shelf', label: '見渡す', deg: 24, hit: 41, arrow: '↗', say: '斜め上' },
  { id: 'search', label: '探す', deg: 58, hit: 77, arrow: '↗', say: 'もっと斜め上' },
  { id: 'ask', label: '頼む', deg: 96, hit: 999, arrow: '↑', say: '真上' },
];
// 「戻す」は原点の**真下**。半径は原点の実測の高さから決めるので、ここには持たない。
export const BACK_DIR = { id: '__back', label: '戻す', arrow: '↓', say: '下' };

// 在庫の偏りを見せるための集計。均等に並べないのが目的なので件数順のまま返す。
export function shelfBars(graph, top = 11) {
  const all = graph.tags.filter((t) => t.count > 0);
  const head = all.slice(0, top);
  const rest = all.slice(top);
  const restN = rest.reduce((s, t) => s + t.count, 0);
  return { head, rest, restN, max: head[0]?.count || 1 };
}
