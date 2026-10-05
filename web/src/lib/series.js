// 「続きもの」——**続きが増えていく入れ物**を1つの集合として見るための索引。
//
// muninn には、単体で完結する記事（notes）とは別に、中身が増え続ける入れ物が3種類ある:
//   連載（atlas）  章が増える     … 読む順路があり「どこまで読んだか」がある
//   記録帖（logs） 件数が増える   … 同じ項目で貯めて並べて比べる
//   定点（follows）回数が増える   … 同じ条件で観測して前回と比べる
//
// これらは棚（タグの在庫マップ）では**中の1ノードとしてしか出てこない**ので、
// 「そもそもどんな連載があるんだっけ」に答える場所がどこにも無かった。
// 全文検索は名前を覚えている人にしか効かない——覚えていないから探しているのに。
//
// ここは lib なので**面の名前を知らない**。どの面から呼んでも同じ答えを返す
// （読了だけは localStorage 由来なので、呼び出し側から reads を渡してもらう）。

import { cleanTitle, shortTitle } from './graph.js';

// 画面に出す語。concern 名（atlas / logs / follows）は出さない。
export const SERIES_KINDS = [
  { id: 'atlas', label: 'Series', lead: '順路に沿って章を読み進める', unit: '章' },
  { id: 'log', label: 'Logbook', lead: '同じ項目で貯めて、並べて比べる', unit: '件' },
  { id: 'follow', label: 'Tracker', lead: '同じ条件で観測して、前回と比べる', unit: '回' },
];

export const kindMeta = (id) => SERIES_KINDS.find((k) => k.id === id) || SERIES_KINDS[0];

const maxDate = (list) => list.filter(Boolean).sort().pop() || null;

// 本文の書き出しを1行に落とす。入れ物の中身は「タイトルだけでは何の話か分からない」ことが多く、
// 一覧で選ばせるには一言が要る。**正本に説明文の frontmatter を足させない**ためにここで作る
// （表示の都合で正本のスキーマを増やさない。DESIGN.md §7）。
export function firstLine(md, max = 96) {
  for (const raw of (md || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[#>|]/.test(line) || /^[-*]\s/.test(line) || /^-{3,}$/.test(line)) continue;
    const t = line
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b || a)
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, '')
      .trim();
    if (!t) continue;
    return t.length > max ? `${t.slice(0, max)}…` : t;
  }
  return '';
}

// site の3つの入れ物を同じ形に揃える。
// reads は `{ [atlasSlug]: Set<conceptSlug> }`（App が全アトラスぶん持っている）。
export function buildSeries(site, reads = {}) {
  const out = [];

  for (const a of site.atlases || []) {
    const read = reads[a.slug] || new Set();
    const written = a.concepts.filter((c) => c.status !== 'stub');
    const done = written.filter((c) => read.has(c.slug)).length;
    const route = a.routes?.[0] || null;
    const bySlug = new Map(a.concepts.map((c) => [c.slug, c]));
    const order = route?.order?.length ? route.order : a.concepts.map((c) => c.slug);
    // 「続きから」はルートの順路に従う。読了済みを飛ばして最初の未読（執筆済み）を指す。
    const nextC = order.map((s) => bySlug.get(s)).find((c) => c && c.status !== 'stub' && !read.has(c.slug));
    out.push({
      key: `atlas:${a.slug}`, kind: 'atlas', route: `/atlas/${a.slug}`,
      title: cleanTitle(a.title), tags: a.tags || [], gist: firstLine(a.body),
      updated: maxDate(a.concepts.map((c) => c.updated)),
      total: written.length, done, stubs: a.concepts.length - written.length,
      progress: written.length ? done / written.length : null,
      next: nextC
        ? {
          title: shortTitle(nextC.title), gist: nextC.gist,
          route: `/atlas/${a.slug}/concept/${nextC.slug}${route ? `?route=${route.id}` : ''}`,
          routeLabel: route?.label || '',
        }
        : null,
      ref: a,
    });
  }

  for (const t of site.logtopics || []) {
    out.push({
      key: `log:${t.slug}`, kind: 'log', route: `/log/${t.slug}`,
      title: cleanTitle(t.title), tags: t.tags || [], gist: firstLine(t.intro),
      updated: maxDate(t.entries.map((e) => e.updated || e.created)),
      total: t.entries.length, done: null, progress: null, next: null, ref: t,
    });
  }

  for (const f of site.follows || []) {
    out.push({
      key: `follow:${f.name}`, kind: 'follow', route: `/follow/${f.name}`,
      title: cleanTitle(f.title), tags: f.tags || [],
      gist: f.goal || firstLine(f.body),
      updated: maxDate([f.updated, f.sessions?.[0]?.date]),
      total: f.sessions?.length || 0, done: null, progress: null, next: null,
      followType: f.followType, ref: f,
    });
  }

  // 既定の並びは「最近動いた順」。同着はタイトルで決める（決定的であること。原則10）
  return out.sort((a, b) => (a.updated === b.updated
    ? a.title.localeCompare(b.title, 'ja')
    : (a.updated || '').localeCompare(b.updated || '') * -1));
}

// 件数の言い方は入れ物ごとに違う。「章 10（読了 3）」と「記録 5件」を同じ書式に丸めない。
export function countText(item) {
  if (item.kind === 'atlas') {
    const stub = item.stubs > 0 ? ` · 未執筆 ${item.stubs}` : '';
    return `章 ${item.total}（読了 ${item.done}）${stub}`;
  }
  if (item.kind === 'log') return `記録 ${item.total}件`;
  return `観測 ${item.total}回`;
}

// ---- 観測条件で推移を割る ----
//
// 定点観測の核は「**同条件で**観て前回と比べる」こと（CLAUDE.md）。だから条件が違う観測を
// 1本の折れ線に混ぜると、線が描いているのは本人の変化ではなく**条件の違い**になる。
// ゴルフのスコアが分かりやすい例で、やさしいコースと難しいコースの 102 → 110 は悪化ではない。
// これは原則9（数字に嘘をつかせない）の、指標の向きではなく**比較の土台**の側の話。
//
// 条件は正本の session frontmatter `condition:`（任意）で宣言する。**宣言が無ければ従来どおり1本**
// ——既存の定点を黙って割らないため、そして「条件を立てる価値があるか」は正本側の判断だから。
//
// 戻り値: [{ condition, series: [{key, goal, points}], latest }]（新しい観測を持つ条件が先）
export function splitSeriesByCondition(follow) {
  const all = follow?.series || [];
  const whole = [{ condition: null, series: all, latest: null }];
  if (!all.length) return whole;

  const conds = new Set();
  for (const s of all) for (const p of s.points) if (p.condition) conds.add(p.condition);
  // 条件が1種類しかないなら割る意味がない（割ると見出しだけ増えて情報が増えない）。
  if (conds.size < 2) return whole;

  const buckets = new Map(); // condition(null可) -> series[]
  for (const s of all) {
    for (const p of s.points) {
      const k = p.condition || null;
      if (!buckets.has(k)) buckets.set(k, new Map());
      const bs = buckets.get(k);
      if (!bs.has(s.key)) bs.set(s.key, { key: s.key, goal: s.goal, points: [] });
      bs.get(s.key).points.push(p);
    }
  }

  return [...buckets.entries()]
    .map(([condition, bs]) => {
      const series = [...bs.values()];
      const latest = series.flatMap((s) => s.points.map((p) => p.date)).sort().pop() || null;
      return { condition, series, latest };
    })
    // 直近に観測した条件を先頭に。いま比べたいのはたいてい「この前やったやつ」。
    .sort((a, b) => (a.latest === b.latest ? 0 : (a.latest || '') < (b.latest || '') ? 1 : -1));
}

// 条件の見出しに出す語。未宣言の観測が混ざったときに無言で消さない。
export const conditionLabel = (c) => c || '条件の記録なし';
