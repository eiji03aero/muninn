// 面「一本の欄」の探索対象。
//
// 専用の検索インデックスは作らない。`graph.nodes` は復号済みで全部メモリ上にあり、
// 200ノード規模なら素の indexOf 総当たりで数ミリ秒（PBI-03「検索の実装」）。
// ここでやるのは「ノードに、欄から引くための顔（見出し・添え書き・干し草）を付ける」だけ。

import { typeLabel, tagLabel, cleanTitle } from '../../lib/graph.js';

// 索引そのもの（moc/home）は「全MOCの入口」＝この面がその役なので、探索対象から外す。
const HIDDEN = new Set(['/moc/home']);

// 本文の冒頭だけを、地の文として取り出す。
// 最初の見出し（## Links / ## Sources 等）以降は付随情報なので切る。
export function plain(src, n) {
  let s = String(src || '').replace(/\r/g, '');
  const cut = s.search(/\n#{1,6}\s/);
  if (cut >= 0) s = s.slice(0, cut);
  s = s
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_m, a, b) => b || a)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*`>]/g, '')
    .replace(/^\s*[-–—]\s*/gm, '')
    .replace(/\s*\n+\s*/g, '　')
    .trim();
  return n ? s.slice(0, n) : s;
}

// 束の見出しは英字の正本タイトル（`Golf — ゴルフのMOC`）ではなく和名側を拾う。
// 画面に内部語彙（MOC）を出さないためでもあり、英字だけの札が並ぶと何の束か分からないため。
export function mocLabel(title) {
  const t = String(title || '');
  let after = (t.split('—')[1] || '').replace(/\s*MOC\s*$/i, '').replace(/の$/, '').trim();
  if (!after) {
    const p = /（([^）]+)）/.exec(t.split('—')[0] || '');
    after = p ? p[1] : (t.split('—')[0] || t).trim();
  }
  return after;
}

// 一覧でも詳細でも同じ見出しを使う（同じものが場所によって別名で出ない）
export const displayTitle = (node) => (node.type === 'moc'
  ? mocLabel(node.title)
  : node.type === 'follow' || node.type === 'atlas' ? cleanTitle(node.title)
  : node.short || node.title);

// 本文から `## Links` の節だけを落とす。
// この面は「ここから出ていく道」で同じリンクを**理由つき・覗ける形**で出すので、
// 生の箇条書きを本文にも残すと同じものが2回並ぶ。`## Sources`（外部URL）は他に出口が無いので残す。
export function bodyForReading(node) {
  if (node.type !== 'note' && node.type !== 'concept') return node.body || '';
  const lines = String(node.body || '').split('\n');
  const out = [];
  let skipping = false;
  for (const line of lines) {
    const h = /^#{1,6}\s*(.+?)\s*$/.exec(line);
    if (h) skipping = /^links$/i.test(h[1]);
    if (!skipping) out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ノード → 添え書き（見出しの下に薄く出す一行）
function subOf(n) {
  switch (n.type) {
    case 'note': return (n.tags || []).map(tagLabel).join(' · ');
    case 'concept': return n.status === 'stub' ? 'まだ書かれていない' : (n.ref.gist || '');
    case 'entity': return [n.ref.role, n.ref.club].filter(Boolean).join(' · ');
    case 'follow': return n.ref.goal || (n.ref.sessions || []).length + '回の観測';
    case 'session': return n.ref.summary || plain(n.body, 60);
    case 'atlas': return (n.ref.routes || []).map((r) => r.label).join(' / ');
    case 'logtopic': return `${(n.ref.entries || []).length}件`;
    case 'logentry': return Object.values(n.ref.fields || {})
      .filter((v) => typeof v === 'string').slice(0, 2).join(' · ');
    case 'moc': return (n.ref.sections || []).map((s) => s.title).join(' · ');
    default: return '';
  }
}

// 検索に使う干し草。見出し・タグ・slug・本文・種別ごとの構造化データを1本に潰す。
function hayOf(n, sub) {
  const extra = n.type === 'logentry' ? JSON.stringify(n.ref.fields || {})
    : n.type === 'entity' ? [...(n.ref.strengths || []), ...(n.ref.developing || [])].join(' ')
    : n.type === 'follow' ? (n.ref.snapshot || []).join(' ')
    : '';
  return [n.title, n.slug, (n.tags || []).join(' '), (n.tags || []).map(tagLabel).join(' '),
    sub, extra, n.body].join('\n').toLowerCase();
}

export function buildItems(graph) {
  const items = [];
  for (const n of graph.nodes) {
    if (HIDDEN.has(n.route)) continue;
    const sub = subOf(n);
    items.push({
      id: n.route,
      node: n,
      kind: n.type,
      label: typeLabel(n.type),
      title: displayTitle(n),
      sub,
      hay: hayOf(n, sub),
    });
  }
  return items;
}

// ---- 絞り込み ----
// 見出しの前方一致 > 見出しの部分一致 > 添え書き > 本文、の順で重みを付けるだけ。
// すべてのトークンがどこかに当たったものだけを残す（AND）。
function score(it, toks) {
  const T = it.title.toLowerCase();
  let s = 0;
  for (const t of toks) {
    if (!t) continue;
    const ti = T.indexOf(t);
    if (ti === 0) s += 100;
    else if (ti > 0) s += 64;
    else if (it.sub.toLowerCase().indexOf(t) >= 0) s += 34;
    else if (it.hay.indexOf(t) >= 0) s += 18;
    else return -1;
  }
  if (it.kind === 'note') s += 6;
  if (it.kind === 'entity' || it.kind === 'concept') s += 3;
  return s;
}

export function search(items, str, limit = 9) {
  const toks = str.toLowerCase().split(/\s+/).filter(Boolean);
  if (!toks.length) return [];
  const out = [];
  for (const it of items) {
    const s = score(it, toks);
    if (s >= 0) out.push({ it, s });
  }
  out.sort((a, b) => b.s - a.s || a.it.title.length - b.it.title.length);
  return out.slice(0, limit).map((o) => o.it);
}

// ゼロヒットのときだけ回す、ゆるい2-gram一致。
// 「ありません」で終わらせないための材料であって、精度は求めない——
// ただしノイズを出すくらいなら何も出さないほうがよいので、当たりの薄いものは捨てる。
export function nearMiss(items, str, limit = 4) {
  const s = str.toLowerCase().replace(/\s+/g, '');
  const g = [];
  for (let i = 0; i < s.length - 1; i += 1) g.push(s.slice(i, i + 2));
  if (!g.length) return [];
  const out = [];
  for (const it of items) {
    const head = `${it.title} ${it.sub}`.toLowerCase();
    let th = 0; let bh = 0;
    for (const x of g) {
      if (head.indexOf(x) >= 0) th += 1;
      else if (it.hay.indexOf(x) >= 0) bh += 1;
    }
    if (th >= 1 || bh >= 2) out.push({ it, sc: th * 3 + bh });
  }
  out.sort((a, b) => b.sc - a.sc);
  return out.slice(0, limit).map((o) => o.it);
}

// 打った語を見出しの中で光らせる（1回の描画で使い捨てる純粋関数）
export function marks(text, toks) {
  if (!toks.length) return [{ hit: false, s: text }];
  const lc = text.toLowerCase();
  const cuts = [];
  for (const t of toks) {
    if (!t) continue;
    let i = lc.indexOf(t);
    while (i >= 0) { cuts.push([i, i + t.length]); i = lc.indexOf(t, i + t.length); }
  }
  if (!cuts.length) return [{ hit: false, s: text }];
  cuts.sort((a, b) => a[0] - b[0]);
  const merged = [cuts[0]];
  for (const c of cuts.slice(1)) {
    const last = merged[merged.length - 1];
    if (c[0] <= last[1]) last[1] = Math.max(last[1], c[1]);
    else merged.push(c);
  }
  const out = [];
  let at = 0;
  for (const [a, b] of merged) {
    if (a > at) out.push({ hit: false, s: text.slice(at, a) });
    out.push({ hit: true, s: text.slice(a, b) });
    at = b;
  }
  if (at < text.length) out.push({ hit: false, s: text.slice(at) });
  return out;
}
